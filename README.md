# WARSAW FC Matchday OS 1.6 — Cloud Sync

Wersja 1.6 dodaje połączenie z Supabase dla projektu:

- `https://kpbzjfanleyaiwhzvsor.supabase.co`
- używany jest publiczny `publishable/anon key`, bez `service_role` w frontendzie

## Co działa w tej wersji

- logowanie admina przez Supabase Auth,
- zapis aktualnej ustawki do wspólnej bazy przez tabelę `matchday_snapshots`,
- wczytywanie aktualnej ustawki z chmury,
- wczytywanie ostatniej zapisanej ustawki,
- opcjonalny autosave do Supabase,
- lokalny `localStorage` nadal działa jako backup/offline,
- stary kod lokalny został zostawiony jako awaryjne wejście.

## Ważne

Przed użyciem Cloud Sync uruchom w Supabase plik:

`supabase-cloud-snapshot-patch-1.6.sql`

Następnie upewnij się, że Twój użytkownik ma w tabeli `profiles` rolę `admin` albo `owner`.

```sql
update public.profiles
set role = 'admin'
where id = 'WKLEJ_TUTAJ_USER_UID';
```

## Pliki

- `index.html` — aplikacja frontendowa
- `package.json` — build do Vercel
- `vercel.json` — konfiguracja Vercel
- `DEPLOY.md` — instrukcja deployu
- `supabase-cloud-snapshot-patch-1.6.sql` — dodatkowa tabela do synchronizacji cloud

## Kolejny etap

Ta wersja zapisuje cały stan ustawki jako snapshot JSON. To jest najszybszy i najbezpieczniejszy etap przejściowy. Następny poziom to pełny zapis do tabel relacyjnych: `events`, `teams`, `team_players`, `matches`, `goals`.
