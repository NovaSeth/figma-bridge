#!/bin/sh
# Zapisuje token Figmy ze schowka do figma-token.txt (nie wypisuje go na ekran). Użycie: skopiuj token w Figmie, potem uruchom ten skrypt.
cd "$(dirname "$0")" || exit 1
T=$(pbpaste | tr -d '[:space:]')
case "$T" in figd_*) ;; *) echo "W schowku nie ma tokenu Figmy (powinien zaczynać się od figd_)."; exit 1;; esac
umask 077; printf '%s' "$T" > figma-token.txt
printf '' | pbcopy
echo "Zapisano. Schowek wyczyszczony. Serwer zacznie czytać komentarze w ciągu 30 s."
