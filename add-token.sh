#!/bin/sh
# Saves the Figma personal access token from the clipboard to <data>/figma-token.txt without showing it.
# The token needs the scopes file_comments:read and file_comments:write (comments are read and answered).
# Use: copy the token in Figma, then run this script.
# A second account (the server tries every figma-token*.txt for each file): sh add-token.sh <name> saves
# figma-token-<name>.txt.
case "$1" in "") FILE=figma-token.txt;; *[!A-Za-z0-9_-]*) echo "Nazwa tokenu może mieć tylko litery, cyfry, - i _."; exit 1;; *) FILE="figma-token-$1.txt";; esac
cd "$(dirname "$0")" || exit 1
DATA=$(node -e "import('./paths.mjs').then(p => console.log(p.dataDir()))") || exit 1
T=$(pbpaste | tr -d '[:space:]')
case "$T" in figd_*) ;; *) echo "W schowku nie ma tokenu Figmy (zaczyna się od figd_; zakres File comments: read i write)."; exit 1;; esac
mkdir -p "$DATA" || exit 1
umask 077; printf '%s' "$T" > "$DATA/$FILE"
printf '' | pbcopy
echo "Zapisano w $DATA/$FILE. Schowek wyczyszczony. Serwer zacznie czytać komentarze w ciągu 15 s."
