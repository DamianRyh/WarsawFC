-- WARSAW FC — ustawienie admina
-- 1. Zarejestruj konto w aplikacji.
-- 2. W Supabase Auth sprawdź email użytkownika.
-- 3. Uruchom poniższe, podstawiając email admina.

update profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'TWOJ_EMAIL_ADMINA'
);

select id, nickname, full_name, role
from profiles
where role = 'admin';
