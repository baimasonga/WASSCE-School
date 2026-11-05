revoke execute on function public._student_payload(public.students) from anon, authenticated;
revoke execute on function public.teacher_reset_pin(uuid,text) from anon;
revoke execute on function public.gen_class_code() from anon;
revoke execute on function public.is_class_teacher(uuid) from anon;
alter default privileges in schema public revoke execute on functions from anon;
