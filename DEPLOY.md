# Deploy — WARSAW FC Matchday OS 1.6 Cloud Sync

## 1. Supabase

W Supabase uruchom kolejno:

1. patch bazy, który już wdrożyłeś,
2. `supabase-cloud-snapshot-patch-1.6.sql`.

Sprawdź, czy istnieje tabela:

- `matchday_snapshots`

Sprawdź też, czy Twój profil ma rolę:

- `admin` albo `owner`

## 2. Vercel

Wgraj do repo:

- `index.html`
- `package.json`
- `vercel.json`
- `README.md`
- `DEPLOY.md`
- `supabase-cloud-snapshot-patch-1.6.sql`

Ustawienia Vercel:

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`

## 3. Test po wdrożeniu

1. Wejdź w aplikację.
2. Zaloguj się przez Supabase.
3. Kliknij `Zapisz cloud`.
4. W Supabase sprawdź tabelę `matchday_snapshots`.
5. Na drugim urządzeniu kliknij `Wczytaj cloud` albo `Ostatnia`.

Nie używaj `service_role` key w frontendzie.
