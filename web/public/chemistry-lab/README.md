# WASSCE Virtual Chemistry Lab: standalone site

A drag-and-drop chemistry lab covering every WAEC Chemistry Paper 3 practical, with a timed mock exam, class codes and a teacher dashboard. It is a plain static website (HTML, CSS and JavaScript), so any static host can serve it.

- `index.html`: the lab (students)
- `teacher.html`: the teacher dashboard
- `js/config.js`: the Supabase URL and publishable key (already filled in for the `wassce-lab` project)

## Deploy (Cloudflare Pages, free)
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Name it, for example `wassce-lab`, and upload this folder (the files, not the zip itself).
3. Your site goes live at `https://wassce-lab.pages.dev` (you can attach your own domain later).

Netlify Drop, GitHub Pages or any web server also work. No build step is needed.

## One-time Supabase settings (project `wassce-lab`)
In the Supabase dashboard → **Authentication**:
1. **URL Configuration** → set **Site URL** to your live address (e.g. `https://wassce-lab.pages.dev`) and add `https://wassce-lab.pages.dev/teacher.html` under **Redirect URLs**. Teachers' confirmation and password-reset emails link there.
2. **Email**: Supabase's built-in email sender only delivers to your own team's addresses and is heavily rate-limited. Before inviting other teachers, either:
   - add a custom SMTP provider (Authentication → Emails → SMTP Settings; e.g. Resend or Brevo free tiers), **or**
   - for a small pilot, turn off **Confirm email** (Authentication → Sign In / Providers → Email), so teachers can sign in straight after signing up.

## How it works
- **Teachers** sign up with email and a password, create a class and get a 6-character code.
- **Students** open the lab, tap **Join your class**, and enter the code, their index number, full name and a 4–6 digit PIN. They need no email or account.
- Mission reports and mock exam results are sent automatically. With no internet they are kept on the phone and sent when it reconnects (shown as ⏳ in the top bar).
- In the dashboard teachers can:
  - see an overview: grade spread, most-missed marking points, mission completion
  - manage students: reset a PIN, remove a student
  - browse every result, with Q1/Q2/Q3 breakdowns
  - set assignments with due dates (students see them in the lab)
  - export results as CSV for Excel.

## Security
- Row-level security is on for every table. Teachers can only read their own classes.
- Students never read tables directly. They go through server functions that check the class code and a bcrypt-hashed PIN. Eight wrong PINs lock the account for 15 minutes.
- A student's device keeps a secret token so they stay signed in. "Sign out on this device" removes it.
- The publishable key in `js/config.js` is meant to be public. Never put the `service_role` key in the site.

## Database
Tables: `teachers`, `classes`, `students`, `attempts`, `assignments`.
Functions: `class_lookup`, `student_join`, `student_login`, `student_me`, `submit_attempt`, `teacher_reset_pin`.
