# Wdrożenie na Vercel — WARSAW FC Matchday OS 1.5

Wgraj do głównego katalogu repozytorium:

- index.html
- package.json
- vercel.json
- README.md
- DEPLOY.md
- .gitignore

## Ustawienia Vercel

- Framework Preset: Other
- Build Command: npm run build
- Output Directory: dist
- Root Directory: katalog, w którym leży index.html i package.json

## Po deployu

1. Zrób hard refresh: Cmd+Shift+R / Ctrl+F5.
2. Sprawdź, czy aplikacja pokazuje wersję 1.5 w tytule strony.
3. Wejdź w widok publiczny z ekranu startowego.
4. Zaloguj się do panelu admina i sprawdź:
   - liczba zespołów od 2 do 10,
   - Szybki Admin,
   - cofanie gola,
   - zapis ustawki i pobieranie backupu JSON,
   - przełącznik Warsaw FC / Partner mode.

## Rekomendowany test przed ustawką

- wygeneruj terminarz,
- kliknij kilka goli w Szybkim Adminie,
- cofnij ostatniego gola,
- przejdź do widoku publicznego,
- zapisz ustawkę,
- pobierz backup JSON,
- zrób import backupu na drugim urządzeniu.
