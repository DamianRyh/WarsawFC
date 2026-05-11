# WARSAW FC Base 1.1 — Auth Stable

Poprawki względem 1.0:
- odzyskiwanie hasła,
- ustawianie nowego hasła po linku resetu,
- ponowne wysyłanie potwierdzenia email,
- komunikaty błędów/sukcesu w UI,
- lepszy redirect Supabase po rejestracji/resetowaniu.

## Ważne ustawienie w Supabase

W Supabase przejdź do:
Authentication → URL Configuration

Ustaw:
- Site URL: adres Twojej aplikacji z Vercel, np. `https://twoj-projekt.vercel.app`
- Redirect URLs: ten sam adres oraz ewentualnie domenę docelową.

Bez tego linki potwierdzenia i odzyskiwania hasła mogą kierować w złe miejsce.
