# WARSAW FC Base 1.3 — Auth Reset Final Fix

Naprawka:
- przycisk „Nie pamiętam hasła” ma bezpośredni handler bez requireAdmin,
- przycisk „Wyślij ponownie potwierdzenie” ma bezpośredni handler bez requireAdmin,
- przycisk „Ustaw nowe hasło” ma bezpośredni handler bez requireAdmin,
- modal auth zatrzymuje kliknięcia, żeby nie trafiały w panel admina pod spodem.

Po wgraniu tej wersji zrób hard refresh:
- Mac: Cmd + Shift + R
- Windows: Ctrl + F5
