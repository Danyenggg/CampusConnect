# CampusConnect — NISU West Campus

Initial static frontend for the CampusConnect student portal.

## Files
- `index.html` — landing page, login, registration, and student application UI
- `styles.css` — responsive blue-and-white styling
- `app.js` — Supabase authentication and student application flow
- `config.js` — public Supabase URL and publishable browser key

## Stack
- HTML, CSS, vanilla JavaScript
- Supabase Auth and Postgres
- Supabase JavaScript client loaded from jsDelivr

## Registration flow
1. A student creates an account using their name, email, and password.
2. The database trigger creates a `profiles` row with the student role and pending status.
3. If email confirmation is enabled, the student confirms their email and signs in.
4. The student submits a student number, program, and year level.
5. The application is stored in `student_applications` with its default pending status.
6. An administrator reviews the application using the existing approval workflow.

## Deployment
This is a static site and can be hosted with GitHub Pages. In the repository settings, enable Pages from the `main` branch and the root folder.

## Security notes
- The browser uses only the Supabase publishable key. Never add a service-role or secret key to frontend files.
- Database access is enforced by Supabase Row Level Security and database policies.
- This is the initial student-facing frontend. Admin screens and the remaining student services will be developed in later milestones.

## Current limitations
- The application form does not upload documents yet.
- Admin approval is handled in the Supabase backend; no admin dashboard is included in this starter.
- Email confirmation behavior follows the Supabase Auth settings for the project.