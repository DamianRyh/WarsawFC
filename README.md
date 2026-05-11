# WARSAW FC Base 1.2 — Auth Hotfix

Naprawka:
- reset hasła nie wymaga już uprawnień admina,
- ponowne wysyłanie potwierdzenia nie wymaga admina,
- przyciski Auth mają type=button,
- dodany przycisk zamykania modala logowania,
- dodany niezależny handler Auth, który omija requireAdmin.

Ważne:
W Supabase → Authentication → URL Configuration ustaw:
- Site URL: URL aplikacji Vercel
- Redirect URLs: URL aplikacji Vercel
