(() => {
  const config = window.CAMPUSCONNECT_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const $ = (id) => document.getElementById(id);
  const show = (id, visible) => $(id).classList.toggle("hidden", !visible);
  const message = (id, text) => { $(id).textContent = text || ""; };
  $("yearNow").textContent = new Date().getFullYear();

  function showAuthForm(formId) {
    ["loginForm", "registerForm", "forgotForm", "resetForm"].forEach((id) => show(id, id === formId));
    show("loginTab", formId === "loginForm" || formId === "registerForm");
    show("registerTab", formId === "loginForm" || formId === "registerForm");
  }

  $("loginTab").addEventListener("click", () => {
    showAuthForm("loginForm");
    $("loginTab").classList.add("active"); $("registerTab").classList.remove("active");
    message("authMessage", "");
  });
  $("registerTab").addEventListener("click", () => {
    showAuthForm("registerForm");
    $("registerTab").classList.add("active"); $("loginTab").classList.remove("active");
    message("authMessage", "");
  });

  $("forgotPasswordLink").addEventListener("click", () => {
    showAuthForm("forgotForm");
    message("authMessage", "");
  });
  $("backToLogin").addEventListener("click", () => {
    showAuthForm("loginForm");
    message("authMessage", "");
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = $(button.dataset.passwordToggle);
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.textContent = reveal ? "Hide" : "Show";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(reveal));
    });
  });

  function passwordIsValid(password) {
    return password.length >= 8 && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
  }

  $("forgotForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("authMessage", "Sending password reset email...");
    const email = $("forgotEmail").value.trim();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) return message("authMessage", error.message);
    message("authMessage", "If an account exists for that email, a password reset link has been sent. Check your inbox.");
  });

  $("resetForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("newPassword").value;
    const confirmation = $("confirmNewPassword").value;
    if (!passwordIsValid(password)) {
      return message("authMessage", "Password must be at least 8 characters and include a number and a special character.");
    }
    if (password !== confirmation) return message("authMessage", "The passwords do not match.");
    message("authMessage", "Updating your password...");
    const { error } = await client.auth.updateUser({ password });
    if (error) return message("authMessage", error.message);
    await client.auth.signOut();
    $("resetForm").reset();
    showAuthForm("loginForm");
    message("authMessage", "Password updated. You can now log in with your new password.");
  });

  $("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("authMessage", "Creating your account...");
    const fullName = $("fullName").value.trim();
    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    if (!passwordIsValid(password)) {
      return message("authMessage", "Password must be at least 8 characters and include a number and a special character.");
    }
    const { data, error } = await client.auth.signUp({
      email, password, options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) return message("authMessage", error.message);
    if (data.session) {
      message("authMessage", "Account created. Complete your student application on the right.");
      await loadWorkspace(data.user);
    } else {
      message("authMessage", "Account created. Check your email for the confirmation link, then return here and log in.");
      $("loginTab").click();
    }
  });

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("authMessage", "Signing in...");
    const { data, error } = await client.auth.signInWithPassword({
      email: $("loginEmail").value.trim(),
      password: $("loginPassword").value
    });
    if (error) return message("authMessage", error.message);
    message("authMessage", "");
    await loadWorkspace(data.user);
  });

  async function loadPrograms() {
    const select = $("programSelect");
    const { data, error } = await client.from("programs")
      .select("id,program_code,program_name").eq("is_active", true).order("program_name");
    if (error) {
      select.innerHTML = '<option value="">Unable to load programs</option>';
      message("studentMessage", error.message);
      return;
    }
    select.innerHTML = '<option value="">Select your program</option>';
    (data || []).forEach((program) => {
      const option = document.createElement("option");
      option.value = program.id;
      option.textContent = program.program_code + " · " + program.program_name;
      select.appendChild(option);
    });
  }

  async function loadWorkspace(user) {
    show("authCard", false); show("studentCard", true);
    $("welcomeTitle").textContent = "Welcome, " + (user.user_metadata?.full_name || user.email);
    await loadPrograms();
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("full_name,status,role").eq("id", user.id).single();
    if (profileError) return message("studentMessage", "Could not load your profile: " + profileError.message);
    const { data: application, error: applicationError } = await client.from("student_applications")
      .select("status,student_number,requested_year_level,programs(program_name)")
      .eq("user_id", user.id).maybeSingle();
    if (applicationError) return message("studentMessage", applicationError.message);
    if (application) {
      show("applicationForm", false);
      show("applicationStatus", true);
      $("applicationStatus").innerHTML = '<div class="status-box"><span class="status-pill">' +
        escapeHtml(application.status.toUpperCase()) + '</span><h4>Application received</h4><p>Student number: ' +
        escapeHtml(application.student_number) + '</p><p>Program: ' +
        escapeHtml(application.programs?.program_name || "—") + '</p><p>Year level: ' +
        escapeHtml(application.requested_year_level ? application.requested_year_level + (application.requested_year_level === 1 ? "st" : application.requested_year_level === 2 ? "nd" : application.requested_year_level === 3 ? "rd" : "th") + " Year" : "—") +
        '</p><p>Your application is awaiting administrative review.</p></div>';
    } else if (profile.status === "active") {
      show("applicationForm", false);
      show("applicationStatus", true);
      $("applicationStatus").innerHTML = '<div class="status-box">Your student account is active. Student services will appear here as they are enabled.</div>';
    } else {
      show("applicationForm", true);
      show("applicationStatus", false);
    }
  }

  $("applicationForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("studentMessage", "Submitting application...");
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return message("studentMessage", "Your session expired. Please log in again.");
    const payload = {
      user_id: auth.user.id,
      student_number: $("studentNumber").value.trim(),
      program_id: $("programSelect").value,
      requested_year_level: Number($("yearLevel").value),
      birthdate: $("birthdate").value || null
    };
    const { error } = await client.from("student_applications").insert(payload);
    if (error) return message("studentMessage", error.message);
    message("studentMessage", "Application submitted successfully.");
    await loadWorkspace(auth.user);
  });

  $("logoutButton").addEventListener("click", async () => {
    await client.auth.signOut();
    show("studentCard", false); show("authCard", true);
    $("loginTab").click();
    message("authMessage", "You have been logged out.");
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      show("authCard", true);
      show("studentCard", false);
      showAuthForm("resetForm");
      message("authMessage", "Enter and confirm your new password.");
    }
  });

  client.auth.getSession().then(({ data }) => {
    if (data.session?.user) loadWorkspace(data.session.user);
  });
})();