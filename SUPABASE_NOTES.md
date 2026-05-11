# SUPABASE NOTES

## Project

URL i publishable key są w `config.js`.

## Tabele wymagane

- profiles
- events
- event_players
- matches
- goals
- season_stats view

## Admin

Po rejestracji konta ustaw admina w SQL:

```sql
update profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'TWOJ_EMAIL'
);
```

## Następny krok

Po stabilizacji frontendu:
- zapisywać matches do Supabase,
- zapisywać goals do Supabase,
- pobierać eventy online,
- dodać realtime.
