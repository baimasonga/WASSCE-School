# Chemistry lab class server (Supabase)

These migrations are the database behind the website lab's class features (`web/public/chemistry-lab/js/cloud.js` for students, `teacher.html` / `js/teacher.js` for teachers). They were exported unchanged from the `wassce-lab` project's migration history on 2026-11-05 and checked byte-for-byte against it; the live functions and grants matched these files at that time. Make future changes here as new migrations so the repository stays the source of truth.

## Access model

- **Teachers** sign in with Supabase Auth (`authenticated`). Row-level security limits every table to the teacher's own classes (`is_class_teacher`). Teachers cannot read `students.pin_hash` or `students.token` (column grants).
- **Students** have no Supabase account. They use the publishable key (`anon`) and can only call these `security definer` functions:
  - `class_lookup(code)`: class name and school for a 6-character code.
  - `student_join` / `student_login`: PINs of 4–6 digits are bcrypt-hashed; 8 wrong PINs lock the student for 15 minutes.
  - `student_me(token)` / `submit_attempt(token, …)`: the student's own assignments and results; submissions are capped at 60 per hour.
- `anon` has no table policies, so direct table access returns nothing.

## Hardening (migration `20261105134520_wassce_lab_harden_students`)

- **Rate limit:** `attempts.received_at` is set by the server and the 60-per-hour cap counts it, so a backdated `p_at` no longer dodges the cap. `created_at` still records when the device says the work was done (results queue offline), but it is clamped to no later than now, no earlier than 14 days ago, and no earlier than the student joining.
- **Sign-out:** `student_logout(token)` replaces the student's token, so "Sign out" now signs the student out on every device. `teacher_reset_pin` does the same. Results still queued on another device under the old token are discarded when that device next connects.
- **Login errors:** `student_login` gives `wrong_pin` for both an unknown index number and a wrong PIN, and runs bcrypt on both paths so the timing matches.

Applied to the live project on 2026-11-05 and tested there in a rolled-back transaction as the `anon` and `authenticated` roles.

## Remaining limitations

- `student_join` still answers `already_joined` for an index number that is in the class, and `student_login` answers `locked` only for a real student. Someone with a class code can therefore still find out which index numbers have joined. Closing this would mean changing how joining works.
- Student PINs are 4–6 digits. The lockout allows about 8 guesses, then one guess per 15 minutes, which is roughly 100 guesses a day.
