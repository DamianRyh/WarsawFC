# WARSAW FC Matchday Base — Supabase Ready v1

Podłączono Supabase:

- Project URL: `https://kpbzjfanleyaiwhzvsor.supabase.co`
- Publishable key: dodany w `index.html`
- Supabase Auth: rejestracja i logowanie email/hasło
- Profile zapisują się w tabeli `profiles`
- Możliwość pobrania profili online do aplikacji
- Możliwość zapisania aktualnej ustawki online do tabeli `events`

## Ważne

Nie wrzucaj secret key/service role do frontendu.

## Po deployu

1. Wejdź w aplikację.
2. Zarejestruj konto.
3. W Supabase SQL Editor uruchom `supabase_admin_role.sql`, podstawiając swój email.
4. Zaloguj się ponownie — będziesz adminem.

## Pliki SQL

- `supabase_seed_events.sql` — wgrywa ustawki S03E03-S03E12 do bazy.
- `supabase_admin_role.sql` — ustawia admina.
