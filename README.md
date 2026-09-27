# Figma bridge (localhost)

Lokalny most do Plugin API Figmy: Claude wysyła skrypt, wtyczka wykonuje go w otwartym pliku i odsyła wynik (JSON + zrzuty PNG do `out/`).

## Uruchomienie
1. `node server.mjs` (słucha tylko na `127.0.0.1:8765`, generuje `token.txt` i `ui.html`).
2. Figma desktop: Plugins > Development > Import plugin from manifest… > `manifest.json`.
3. Uruchom „Claude Bridge (localhost)" w pliku, na którym ma pracować. Zostaw okno wtyczki otwarte.
4. `node run.mjs skrypt.js` wykonuje skrypt. `node run.mjs --status` pokazuje, czy wtyczka jest podłączona.

W skrypcie dostępne są `figma` (Plugin API, top-level `await`, `return` jako wynik), `await shot(node, {scale, name})` oraz `progress(0..1, opis)`.

### Plan w oknie wtyczki
`node plan.mjs "x:zrobione" ">:w toku" "-:do zrobienia"` ustawia listę kroków.

Kroku nie odhacza się ręcznie — wiąże się go z zadaniem:

```
node run.mjs jobs/x.js 60000 --krok "Ratunek ekranu 13"
```

Przed uruchomieniem krok idzie na „w toku", po udanym przebiegu na „zrobione".
Gdy zadanie padnie, krok **zostaje w toku** — plan ma mówić prawdę, a nie pocieszać.
Odhaczanie z ręki kończyło się tym, że okno pokazywało „Analizuję" przy pracy, która
dawno się skończyła.

## Komentarze jako „hook"
Plugin API nie widzi komentarzy, więc serwer odpytuje oficjalne REST API co 30 s i zamienia nowe komentarze w zdarzenia.
1. Figma > Settings > Security > Personal access tokens > Generate new token. Zakres: tylko **Comments: Read**.
2. Zapisz token do `figma-token.txt` w tym folderze (`chmod 600 figma-token.txt`). Plik jest w `.gitignore`.
3. `node run.mjs --status` pokaże `comments: działa`. Pliki do śledzenia: `watch.json` plus plik, w którym działa wtyczka.
4. `node wait.mjs` czeka na zdarzenie, wypisuje je i kończy działanie. Uruchomione w tle przez Claude'a budzi sesję, gdy dodasz komentarz. Nieodebrane zdarzenia czekają w `events.jsonl`.

Pierwsze odpytanie tylko zapamiętuje istniejące komentarze. Zamykanie komentarzy nie jest dostępne w REST API, robi się to w interfejsie Figmy.

## Zakres i bezpieczeństwo
- Działa tylko w pliku, w którym uruchomiono wtyczkę, i tylko dopóki jej okno jest otwarte. Zamknięcie okna odcina dostęp.
- To zakres Plugin API: warstwy, style, zmienne, eksport. Bez komentarzy, uprawnień, innych plików i ustawień konta.
- Każde żądanie wymaga tokenu z `token.txt` (plik 0600, poza gitem). Serwer nie słucha na interfejsach sieciowych, a manifest pozwala wtyczce łączyć się wyłącznie z `http://localhost:8765`.
- Kto zna token i ma dostęp do tego komputera, może wykonać kod w otwartym pliku Figmy. Nie udostępniaj `token.txt` ani `ui.html`. Nowy token: usuń `token.txt`, uruchom serwer i wtyczkę ponownie.

## Design system → DESIGN.md
Design system projektu FLibrus żyje w Figmie (strona „Design System": Fundamenty, Atomy, Molekuły, Organizmy). Eksport do formatu DESIGN.md (Stitch, `google-labs-code/design.md`):

```sh
node run.mjs jobs/ds-90-export.js > out/ds-export.json   # odczyt zmiennych, stylów i komponentów z Figmy + audyt wiązań
node export-design-md.mjs [ścieżka/DESIGN.md]              # domyślnie out/DESIGN.md
npx @google/design.md lint out/DESIGN.md                   # oczekiwane: 0 błędów, 0 ostrzeżeń
npx @google/design.md export --format dtcg out/DESIGN.md   # albo css-tailwind / json-tailwind
```

`out/DS-AUDIT.md` to audyt systemu i migracji makiet. `ds-tokens.json` to plan tokenów (źródło dla `jobs/ds-10-tokens.js`), `ds-components.json` mapuje komponenty Figmy na wpisy `components` w DESIGN.md, `ds-state.json` to dziennik budowy. Skrypty `jobs/ds-*.js` są idempotentne (sprawdzają, czy element już istnieje).
