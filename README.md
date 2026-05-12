# WARSAW FC FINAL 1.0

Finalna stabilna wersja aplikacji Admin Only.

Zachowane funkcje:
- kod admina
- kalendarz sezonu
- terminarz
- losowanie teamów
- wyniki
- strzelcy
- tabela
- ranking
- profile graczy
- proste dane gracza:
  - imię i nazwisko
  - zdjęcie
  - ksywa
  - rok urodzenia
  - dzielnica
  - team
  - krótka notatka ogólna
- generator kart:
  - karta Ustawki
  - karta Sezonu
  - style: Poster / Clean / Adidas Test / Top Scorer
  - eksport PNG
- tryb TV
- eksport/import JSON

Kod admina:
`WFC-ADMIN`

Workflow:
1. Kalendarz → wczytaj ustawkę
2. Profile/Zawodnicy → oznacz obecnych
3. Generuj terminarz
4. Wpisuj wyniki i strzelców
5. Zamknij ustawkę
6. Eksport JSON
