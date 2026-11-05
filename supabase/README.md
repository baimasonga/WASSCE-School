# Chemistry lab class server (Supabase)

These migrations are the database behind the website lab's class features (`web/public/chemistry-lab/js/cloud.js` for students, `teacher.html` / `js/teacher.js` for teachers). They were exported unchanged from the `wassce-lab` project's migration history on 2026-11-05 and checked byte-for-byte against it; the live functions and grants matched these files at that time. Make future changes here as new migrations so the repository stays the source of truth.

## Access model

- **Teachers** sign in with Supabase Auth (`authenticated`). Row-level security limits every table to the teacher's own classes (`is_class_teacher`). Teachers cannot read `students.pin_hash` or `students.token` (column grants).
- **Students** have no Supabase account. They use the publishable key (`anon`) and can only call these `security definer` functions:
  - `class_lookup(code)`: class name and school for a 6-character code.
  - `student_join` / `student_login`: PINs of 4–6 digits are bcrypt-hashed; 8 wrong PINs lock the student for 15 minutes.
  - `student_me(token)` / `submit_attempt(token, …)`: the student's own assignments and results; submissions are capped at 60 per hour.
- `anon` has no table policies, so direct table access returns nothing.

## Known limitations (not yet fixed)

- `submit_attempt` takes the client's `p_at` as `created_at`, and the hourly cap counts by `created_at`. Backdated submissions get around the cap and can appear to have been made before a due date.
- A student's `token` never changes; "Sign out on this device" does not revoke it.
- `student_login` returns `not_found` and `wrong_pin` as different errors, so someone with a class code can find out which index numbers have joined.
