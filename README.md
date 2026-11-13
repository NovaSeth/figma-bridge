# figma-bridge

Własny serwer MCP dla Figmy, zbudowany dla Claude Code, a nie przez Figmę. Claude czyta plik otwarty w Figma desktop
i zmienia go przez Plugin API. Pośredniczą mała wtyczka deweloperska i lokalny serwer na Twoim Macu.

- **Wiedza o całym pliku.** Zarys dowolnej gałęzi (auto-layout, tokeny, tekst, właściwości instancji), zmienne lokalne
  ze wszystkimi trybami, style, komponenty z wariantami i właściwościami, wyszukiwanie na wszystkich stronach.
- **Precyzyjne zmiany.** Claude pisze JavaScript Plugin API. Zmiany masowe albo ryzykowne najpierw idą na sucho: raport
  mówi, co by się zmieniło, a plik zostaje nietknięty.
- **Mało tokenów.** Odpowiedzi to zwarty tekst: jedna linia na węzeł albo token. Każda lista ma limit, a przycięta
  kończy się jawnym „… N more”. Definicje wszystkich ośmiu narzędzi to ok. 2,9 tys. znaków. Zarys 60-węzłowego
  ekranu testowego do głębokości 3 to 42 linie i mniej niż 2,5 tys. znaków. Testy pilnują tych budżetów.
- **Komentarze jako polecenia.** Włączasz w oknie wtyczki „Claude słucha komentarzy”, piszesz komentarz w Figmie,
  a Claude wprowadza zmianę i odpowiada w wątku.

## Ten most czy MCP Figmy

Oficjalny MCP Figmy jest lepszy, gdy z projektu ma powstać kod. Daje kontekst węzła pod implementację, a Code Connect
wiąże komponenty Figmy z komponentami w Twoim repozytorium. Nie wymaga otwartej wtyczki.

figma-bridge jest lepszy, gdy Claude ma tanio poznać strukturę i tokeny pliku albo wprowadzić precyzyjne, także masowe
zmiany z próbą na sucho. Sam nie ma limitów wywołań, ale działa tylko lokalnie i tylko przy otwartym oknie wtyczki.
Obu można używać jednocześnie.

## Jak to działa

```
Claude Code ─stdio─ mcp.mjs ─HTTP─ server.mjs (127.0.0.1:8765) ─ okno wtyczki ─ Plugin API ─ otwarty plik
                                     └─ REST Figmy (komentarze) ─ agent.mjs ─ claude -p   (tryb komentarzy)
```

Serwer działa w tle jako LaunchAgent i nic nie robi, dopóki wtyczka się nie połączy. Okno wtyczki pyta serwer
o zadania, wykonuje je w pliku i odsyła wynik.

Wszystko, co działa, leży poza repozytorium:

```
~/Library/Application Support/Claude Figma Bridge/
  app/        kopia plików wykonywalnych z repo i wygenerowany ui.html (z tokenem mostu)
  data/       token.txt, figma-token*.txt, out/ (zrzuty, wyniki, raporty prób), plan.json, state.json,
              seen-comments.json, events.jsonl, logs/, scratch/ (prawa 0700)
  projects/   lokalne projekty (niżej)
```

Katalog leży w `~/Library`, bo macOS (TCC) nie daje zadaniom launchd dostępu do `~/Documents`, `~/Desktop`
ani `~/Downloads`. Samo repo może leżeć gdziekolwiek.

## Wymagania

- macOS. Instalator zakłada LaunchAgenta, a `add-token.sh` korzysta ze schowka macOS. Na innym systemie instalator
  pomija LaunchAgenta, a serwer uruchamia `mcp.mjs`, gdy startuje sesja Claude Code.
- Figma desktop: wtyczki deweloperskie importuje się tylko w aplikacji. Do zmian potrzebne jest prawo edycji pliku.
- Node.js 20 lub nowszy. Most nie ma wymaganych zależności npm. Playwright jest opcjonalny i potrzebny tylko
  w `tools/sheet.mjs`.
- Claude Code (`claude` w `PATH`) do rejestracji MCP i do trybu komentarzy.
- Do komentarzy: osobisty token Figmy z zakresami `file_comments:read` i `file_comments:write`.

## Instalacja

1. Sklonuj repo i uruchom instalator:
   ```sh
   git clone https://github.com/NovaSeth/figma-bridge.git
   cd figma-bridge
   node install.mjs
   ```
   Instalator kopiuje pliki do `app/`, tworzy `data/` z tokenem mostu i zakłada LaunchAgenta
   `local.claude-figma-bridge`, który uruchamia serwer z systemem. Rejestruje też MCP `figma-bridge` w Claude Code
   dla wszystkich projektów (`claude mcp add --scope user`). Można go uruchamiać wielokrotnie (to samo robi
   `npm run setup`). Samo `npm install` nie instaluje mostu (pobiera tylko opcjonalnego Playwrighta).
2. W Figma desktop wybierz Plugins → Development → Import plugin from manifest… i wskaż plik podany przez instalator:
   `~/Library/Application Support/Claude Figma Bridge/app/manifest.json`.
3. Token Figmy (potrzebny tylko do komentarzy): w Figmie wejdź w Settings → Security → Personal access tokens →
   Generate new token i nadaj zakres File comments z odczytem i zapisem. Skopiuj token i uruchom:
   ```sh
   sh ~/Library/Application\ Support/Claude\ Figma\ Bridge/app/add-token.sh
   ```
   Skrypt bierze token ze schowka i go nie wyświetla. Zapisuje go do `data/figma-token.txt` (0600) i czyści schowek.

**Aktualizacja:** `git pull && node install.mjs`. Instalator podmienia pliki i restartuje serwer. Potem zamknij
i otwórz okno wtyczki w każdym pliku (stare okno działa dalej, ale po staremu) i zacznij nową sesję Claude Code.
`node install.mjs --verify` sprawdza, czy `app/` zgadza się z repo. Klon sprzed 13.11.2026 ma inną historię:
zamiast `git pull` sklonuj repo od nowa.
Inny katalog mostu: `BRIDGE_HOME=/ścieżka node install.mjs`. Instalator odmówi, jeśli ścieżka leży w folderze
chronionym przez TCC.

## Na co dzień

Otwórz plik w Figma desktop i uruchom Plugins → Development → Claude Bridge (localhost). **Okno wtyczki musi zostać
otwarte**, bo przez nie przechodzi każde polecenie. Okno pokazuje stan połączenia, bieżący krok i plan pracy.

### A. Claude Code w dowolnym projekcie

MCP jest zarejestrowany dla wszystkich projektów, więc narzędzia są dostępne w każdej sesji. Jeśli serwer nie działa,
MCP sam go uruchomi.

| Narzędzie | Zwraca | Główne parametry (domyślnie) |
|---|---|---|
| `figma_status` | połączenie, plik, inne pliki z otwartą wtyczką, stronę, zaznaczenie (do 10), projekt, stan słuchania i odczytu komentarzy | `file`: przełącza sesję na inny otwarty plik (klucz albo fragment nazwy) |
| `figma_inspect` | zarys, po linii na węzeł: typ, nazwa, id, rozmiar, auto-layout, wypełnienia (nazwa zmiennej albo hex), tekst, właściwości instancji | `target`: `selection` (domyślnie), `page`, `file`, id albo nazwa; `depth` 3; `maxLines` 200 |
| `figma_find` | węzły po nazwie albo treści tekstu, ze wszystkich stron: `id TYPE "nazwa" · strona › ramka` | `query` (podciąg bez rozróżniania wielkości liter albo `/regex/`); `type` (np. `TEXT,INSTANCE`); `page`; `limit` 30 |
| `figma_library` | zmienne lokalne z wartościami w każdym trybie (alias jako `→nazwa`), style z wartościami albo komponenty z osiami wariantów i właściwościami | `kind`: `variables`, `styles` albo `components`; `filter` |
| `figma_run` | wynik skryptu JS Plugin API jako JSON w jednej linii: `{ok, result \| error, images, dryRun, dryRunReport, project}` | `code` albo `file`; `dryRun` false; `timeoutMs` 120000; `step`; `project`; `noPrelude` |
| `figma_screenshot` | PNG w odpowiedzi (do 4 węzłów) i ścieżki plików w `data/out/` | `target` (jak w inspect, bez stron); `scale` 1; `maxSize` 1024 px (dłuższy bok) |
| `figma_plan` | plan pliku sesji (ten, który pokazuje okno wtyczki w tym pliku) jako lista `[x]` / `[>]` / `[ ]` | `tasks` (zastępuje plan pliku; wpisy otwartych wątków zostają); `add`; `mark` (początek tekstu albo `#N`) z `state` `todo` / `active` / `done`; `clearDone` |
| `figma_comments` | nowe komentarze, po linii na każdy, albo odpowiedź w wątku | `wait` 0–25 s; `replyTo` i `text` |

Przykład, `figma_inspect {target: "1:19", depth: 2}`:

```
FRAME "Inbox" 1:19 390×844 @100,40 V gap16 p24/16 fill=color/surface
  FRAME "List" 1:30 343×520 V gap=space/md stroke=style:Border/Subtle r12
    FRAME "Row 1" 1:31 343×64 H gap8 p12/16 fill×fixed [+3]
  FRAME "Footer" 1:70 343×56 H gap8 fx=style:Elevation/1
    INSTANCE "Button" 1:75 120×40 H fill=#FFFFFF →"Button"{Kind=Secondary,Label="Later"} [+1]
```

`[+N]` oznacza N dzieci, których zarys nie rozwija. `gap=space/md` i `fill=color/surface` to nazwy zmiennych,
a `style:` poprzedza nazwę stylu.

`step` w `figma_run` wiąże skrypt z istniejącym krokiem planu (początek tekstu albo `#N`, czyli wątek o tym
numerze i żaden inny). Przed startem krok ma stan „w toku”, po udanym przebiegu „zrobione”. Gdy skrypt padnie, krok
**zostaje w toku**, bo plan ma mówić, co się naprawdę stało.

Skrypt może trwać dłużej niż 5 minut (`timeoutMs` do godziny): serwer podtrzymuje wtedy odpowiedź, żeby klient
nie zerwał połączenia. Po przekroczeniu `timeoutMs` odpowiedź to `ok: false`, okno wtyczki pokazuje „Krok
przekroczył czas”, a skrypt, którego wtyczka nie skończyła, działa dalej, bo nie da się go przerwać.

### B. Tryb komentarzy

1. Otwórz wtyczkę w pliku i włącz „Claude słucha komentarzy”. Pod przełącznikiem widać stan: „Słucham nowych
   komentarzy”, „Claude pracuje nad #N” albo przeszkodę, np. brak tokenu Figmy.
2. Napisz w Figmie nowy komentarz, najlepiej przypięty do warstwy.
3. Serwer sprawdza komentarze co 15 s. Claude dostaje treść komentarza i zarys przypiętej warstwy, pracuje narzędziami
   figma-bridge i odpowiada w wątku: „Claude: *co zrobił*. Sprawdź i zamknij wątek, jeśli się zgadza.”
4. Sprawdzasz zmianę i zamykasz wątek (Resolve). Wpis znika wtedy z planu w oknie wtyczki.

Każdy otwarty wątek ma wpis w planie swojego pliku: nowe od razu, a te sprzed otwarcia wtyczki od pierwszego
odczytu komentarzy pliku (stare wątki nie budzą Claude'a ani sesji). Komentarz, którym zajmuje się Claude, ma przy
wpisie stan: `w kolejce`, `w toku`, `zrobione`, `nieudane` albo `pominięte: limit N/h`. Wpis zostaje, dopóki nie
zamkniesz wątku.

Claude reaguje tylko na komentarz, który:
- zaczyna nowy wątek (odpowiedzi w wątkach nie uruchamiają Claude'a),
- jest w pliku, w którym wtyczka jest otwarta (przy kilku oknach: w każdym z tych plików),
- powstał, gdy przełącznik był włączony, a wtyczka otwarta w tym pliku.

Sesja Claude'a dla komentarza jest przypięta do pliku komentarza (`FIGMA_FILE`), więc jej zmiany nie trafią do
innego pliku, nawet gdy w międzyczasie otworzysz wtyczkę gdzie indziej.

Każdy nowy komentarz, także taki, którym Claude się nie zajmie, widać w `figma_comments`. Wyłączenie przełącznika
czyści kolejkę, a komentarz w toku kończy się normalnie. Wątek zamknięty, zanim przyszła jego kolej, wypada z kolejki.
Komentarze pliku są czytane jeszcze przez 30 minut po tym, jak wtyczka przestała w nim działać. Zdarzenia, których
nikt nie odebrał, czekają najwyżej 3 dni (zostaje 200 najnowszych, po jednym na komentarz).

**Kilka kont Figmy.** Serwer czyta wszystkie pliki `data/figma-token*.txt`. Dla każdego pliku Figmy próbuje tokenów
po kolei (najpierw `figma-token.txt`) i zapamiętuje ten, który ma do niego dostęp; tym samym tokenem odpowiada
w wątkach. Kolejny token dodaje `add-token.sh <nazwa>`, który zapisuje `data/figma-token-<nazwa>.txt`.

**Koszt i limity.** Każdy komentarz to osobna sesja `claude -p` na Twoim koncie Claude, liczona tak jak każda inna
sesja Claude Code. Jeśli sesja się nie uda albo przekroczy czas, Claude nie odpowiada w wątku, plan pokazuje
`nieudane`, a szczegóły są w `data/logs/server.log`.

| Limit | Domyślnie | Zmienna środowiskowa |
|---|---|---|
| komentarze na godzinę (nadmiarowe są pomijane, nie czekają) | 6 | `BRIDGE_AGENT_MAX_PER_HOUR` |
| czas jednej sesji | 15 min | `BRIDGE_AGENT_TIMEOUT_MS` |
| koszt jednej sesji (`--max-budget-usd`) | 5 USD | `BRIDGE_AGENT_BUDGET_USD` |
| równoległość | jedna sesja naraz, reszta czeka w kolejce | — |

Zmienne czyta serwer. Dopisz je do `EnvironmentVariables` w `~/Library/LaunchAgents/local.claude-figma-bridge.plist`,
a potem wykonaj `launchctl bootout gui/$(id -u)/local.claude-figma-bridge` i `launchctl bootstrap gui/$(id -u)`
z tym plikiem. Ponowna instalacja nadpisuje plist.

### C. Wtyczka w kilku plikach naraz

Wtyczkę można otworzyć w kilku plikach jednocześnie. Każde okno czeka na zadania osobno i pokazuje plan tylko
swojego pliku.

- Polecenie bez wskazanego pliku trafia do okna otwartego jako ostatnie, a gdy to okno zniknie, do najpóźniej
  otwartego z pozostałych. Każde narzędzie MCP i `run.mjs` najpierw pyta serwer o ten plik, a potem wysyła
  zadanie właśnie do niego, więc zadanie nie trafi gdzie indziej, niż pokazał status.
- `figma_status` wymienia pozostałe pliki w linii `other open files`. `figma_status {file: "fragment nazwy"}`
  (albo klucz pliku) przełącza sesję Claude Code na ten plik: od tej chwili wszystkie narzędzia, także plan,
  pracują w nim.
- Z terminala to samo robi `--file <klucz albo fragment nazwy>` w `run.mjs` i `plan.mjs` albo zmienna `FIGMA_FILE`.
- Gdy wtyczka nie jest otwarta we wskazanym pliku, narzędzia MCP od razu odpowiadają „the Claude Bridge plugin is
  not open in file …”. Zadanie z `run.mjs --file` czeka na okno tego pliku do końca swojego czasu. W żadnym
  wypadku zadanie nie wykona się w innym pliku.
- Po aktualizacji mostu otwórz wtyczkę ponownie w każdym pliku. Okno sprzed aktualizacji działa dalej, ale po
  staremu: pokazuje plany wszystkich plików i nie odróżnia się od innych starych okien.

## Projekty

Projekt to lokalny folder `projects/<nazwa>/` w katalogu mostu (nigdy w repo mostu) z plikiem `project.json`:

```json
{
  "name": "my-app",
  "files": ["<klucz pliku Figmy>"],
  "preludes": ["jobs/helpers.js"],
  "agentPrompt": "agent-prompt.md",
  "designMd": "design-md.config.json",
  "jobsDir": "jobs"
}
```

Wymagane jest tylko `name`, które musi być nazwą folderu: bez ukośników i bez kropki na początku. Ścieżki są względne
wobec folderu projektu. Klucz wskazujący brakujący plik daje błąd z nazwą tego klucza.

| Klucz | Co daje |
|---|---|
| `files` | Klucze plików Figmy, z adresu `figma.com/design/<klucz>/…` albo z `figma_status`. Gdy wtyczka działa w takim pliku, projekt wybiera się sam. Serwer czyta też komentarze z tych plików (widać je w `figma_comments`), nawet gdy wtyczka jest otwarta gdzie indziej. |
| `preludes` | Pliki JS z własnymi funkcjami. Dochodzą po wbudowanych do każdego `figma_run` i `run.mjs`, ale nie do `figma_inspect`, `figma_find`, `figma_library` ani `figma_screenshot`. |
| `agentPrompt` | Szablon promptu dla trybu komentarzy, zamiast wbudowanego. Czytany przy każdym komentarzu. Zmienne: `{{fileKey}}`, `{{fileName}}`, `{{number}}`, `{{author}}`, `{{text}}`, `{{nodeId}}`, `{{where}}`, `{{inspect}}`. Blok `{{#klucz}}…{{/klucz}}` zostaje tylko wtedy, gdy wartość istnieje. |
| `designMd` | Konfiguracja `tools/export-design-md.mjs --project <nazwa>`: nazwa, opisy, teksty sekcji i nagłówki tabel w DESIGN.md. Bez niej eksport używa ogólnych tekstów. |
| `jobsDir` | Folder skryptów. `figma_run {file: "x.js"}` szuka pliku najpierw tu, potem w folderze projektu, a na końcu w katalogu sesji. |

Projekt wybiera się według pliku, w którym pracuje sesja (plik z `figma_status`, `--file`), albo jawnie: parametrem
`project` w `figma_run` lub `--project` w `run.mjs`. W trybie komentarzy folder projektu jest katalogiem roboczym Claude'a. Bez projektu jest nim `data/scratch/`.

**Projekt w repozytorium (opcjonalnie).** Repo może mieć plik `.figma-bridge.json` z tymi samymi kluczami. Ścieżki
w nim są względne wobec tego pliku i muszą leżeć wewnątrz repo. Gdy Claude Code startuje w tym repo albo w jego
podkatalogu, MCP kopiuje plik i wszystko, na co wskazuje, do `projects/<name>/`. Ręcznie robi to
`node ~/Library/Application\ Support/Claude\ Figma\ Bridge/app/link.mjs [--force] [katalog]`. To kopia, a nie
dowiązanie: po zmianach w repo zacznij nową sesję albo uruchom `link.mjs` ponownie. Kopia jest potrzebna, bo serwer
w tle nie ma dostępu do `~/Documents` i podobnych folderów.

Łączenie dzieje się bez pytania, więc repo może tylko dodać własny projekt albo odświeżyć ten, który samo
wcześniej połączyło. Odmowa następuje, gdy:
- projekt o tej nazwie powstał ręcznie albo pochodzi z innego repo (zastąpi go dopiero `link.mjs --force`),
- któryś klucz z `files` należy już do innego projektu (jego preludia i prompt trafiałyby do cudzego pliku),
- ścieżka jest dowiązaniem prowadzącym poza repo. Dowiązania wewnątrz kopiowanych folderów są pomijane.

Powód odmowy pokazuje `figma_status` w linii `link:`.

## Próba na sucho

`figma_run {dryRun: true}` (albo `run.mjs --dry-run`, `--na-sucho`) uruchamia skrypt na atrapie `figma`,
która nagrywa zapisy. Okno wtyczki pokazuje wtedy „Próba w toku (bez zapisu)”.

- zapisy do istniejących węzłów, stylów, zmiennych i kolekcji są notowane, ale nie wykonywane;
- obiekty tworzone przez skrypt są prawdziwe (dzięki temu logika skryptu działa) i znikają na końcu;
- `figma.closePlugin`, `triggerUndo`, `saveVersionHistoryAsync` i `setFileThumbnailNodeAsync` są blokowane i notowane;
- łączenie istniejących węzłów (`group`, `flatten`, operacje logiczne, `combineAsVariants`,
  `createComponentFromNode`) daje skryptowi tymczasowy zastępnik;
- przełączanie stron działa, a na koniec wraca strona startowa.

Odpowiedź zawiera raport:
- `counts` z liczbą operacji `set`, `call` i `remove`,
- `touched`, czyli liczbę obiektów, które skrypt by zmienił,
- `created` z typami utworzonych obiektów,
- pierwsze 20 wpisów `entries` z polami `op`, `id`, `name`, `type`, `prop` albo `method`, `from` i `to`,
- `cleanedUp` i `error`.

Pełny raport (do 200 wpisów, liczniki zawsze kompletne) trafia do `data/out/dry-run-<id>.json`, a jego ścieżka
jest w `dryRunReport`.

Ograniczenia:
- Odczyt po przechwyconym zapisie zwraca starą wartość, więc raport pokazuje bezpośrednie skutki. Skrypt, który
  czyta własne zmiany, może pójść inną ścieżką niż w prawdziwym przebiegu.
- `shot()` pokazuje plik bez zmian.
- Zapisy poza dokumentem, np. `figma.clientStorage`, wykonują się naprawdę.
- Skrypt musi skończyć pracę przed `return`, więc każde wywołanie asynchroniczne potrzebuje `await`. Wywołania
  po zakończeniu próby kończą się błędem.
- Obiekt, którego nie udało się sprzątnąć i który nadal jest w dokumencie, jest wymieniony w `error`. Usunięty
  zestaw komponentów Figma trzyma poza dokumentem (da się go przywrócić z instancji); to nie jest pozostałość.
- Próba nie zmienia kroku planu (`step`).

Zwykły przebieg, który się wysypie, usuwa tylko nowe węzły najwyższego poziomu na stronie startowej (sekcje zostają).
Wcześniejsze zmiany zostają w pliku, dlatego zmiany masowe najpierw puszczaj na sucho. Jeśli w tym samym czasie
działał inny skrypt, sprzątania nie ma (komunikat błędu to mówi), bo nowych węzłów nie da się przypisać do skryptu.

## Funkcje pomocnicze

Skrypt to ciało funkcji async z dostępem do `figma`, `shot(node, {scale, name})` (dołącza PNG do wyniku),
`await progress(0..1, opis)` (postęp w oknie wtyczki) i `await breathe()`. Wynik oddajesz przez `return` jako JSON,
więc zwracaj id węzłów, a nie same węzły. Linia `//# Opis` nazywa skrypt w oknie wtyczki.

### Żeby Figma się nie zacinała

Skrypt działa w tym samym wątku co edytor Figmy. Dopóki pętla liczy bez przerwy, cała Figma stoi, a pasek postępu
w oknie wtyczki się nie rusza.

- W każdej dłuższej pętli (po ramkach, sekcjach, węzłach) wołaj `await progress(...)` albo `await breathe()`.
  Najwyżej co 50 ms oddają one na chwilę sterowanie Figmie. Samo `progress(...)` bez `await` tylko wysyła komunikat
  i nie odblokowuje edytora.
- Zamiast `findAll(n => n.type === 'TEXT')` używaj `findAllWithCriteria({ types: ['TEXT'] })` (albo `texts(węzeł)`).
  Jest liczone natywnie, bez wołania funkcji JS dla każdego węzła.
- Nie zagnieżdżaj `findAll` w predykacie innego `findAll`. Wtedy każdy węzeł przeszukuje całe swoje poddrzewo,
  co daje koszt kwadratowy.
- Gdy skrypt nie potrzebuje ukrytych warstw wewnątrz instancji, ustaw na początku
  `figma.skipInvisibleInstanceChildren = true`. Przeszukiwanie dużych plików z komponentami robi się wtedy
  wielokrotnie szybsze. Ustawienie nie przechodzi na następny skrypt.

Wbudowany `prelude.js` dodaje:

| Funkcja | Robi |
|---|---|
| `hex('#0B57D0')`, `solid(kolor, krycie?)` | kolor `{r,g,b}` i gotową listę wypełnień |
| `await usePage(nazwa lub /regex/, {create})` | przełącza na stronę i ją ładuje |
| `all(węzeł)`, `texts(węzeł)` | węzeł ze wszystkimi potomkami; wszystkie teksty, łącznie z samym węzłem |
| `byName(wzorzec, root)`, `one(wzorzec, root)` | węzły pod `root` (domyślnie bieżąca strona) według nazwy, RegExp albo funkcji |
| `await loadFonts(węzły)` | ładuje fonty wszystkich tekstów, także tekstów z mieszanymi fontami |
| `await variable(nazwa, kolekcja?)`, `await paintVar(nazwa)` | zmienną lokalną; wypełnienie powiązane ze zmienną koloru |
| `await component(nazwa)`, `await instance(nazwa, wariant?)` | komponent albo zestaw z dowolnej strony; instancję wariantu (`'Size=Small'` albo `{Size: 'Small'}`) |
| `setProp(instancja, nazwa, wartość)` | ustawia właściwość komponentu po krótkiej nazwie (`Label` zamiast `Label#12:3`) |
| `cloneVariant(zestaw, wariant, nazwa)` | kopię wariantu z zachowanymi powiązaniami właściwości |
| `frame(nazwa, kierunek, props)`, `await text(znaki, {family, style, size, fill})` | ramkę auto-layout; tekst z załadowanym fontem |
| `await inspect(…)`, `await find(…)`, `await library(…)` | to samo co narzędzia MCP, jako tekst |

Sygnatury i pułapki opisuje [AGENTS.md](AGENTS.md).

## Z terminala

Te same funkcje są dostępne bez MCP. Polecenia uruchamiasz w `app/` albo w repo:

```sh
node run.mjs job.js [timeoutMs] [--dry-run] [--step "tekst"] [--project nazwa] [--prelude plik]... [--no-prelude] [--file plik]
node run.mjs --status                          # stan serwera, wtyczki i komentarzy
node run.mjs tools/smoke-test.js --dry-run     # bezpieczny test mostu na otwartym pliku
node plan.mjs [--file plik] "x:zrobione" ">:w toku" "-:do zrobienia"    # także --add, --active "#12", --done "tekst", --clear-done
node wait.mjs                                  # czeka na komentarz i wypisuje zdarzenia jako jedną linię JSON
node tools/snapshot.mjs [etykieta] [strona]    # zrzuty ramek strony do data/out/<etykieta>/ (etykieta: litery, cyfry, . _ -)
node tools/sheet.mjs [katalog w out/] [prefiks] [na arkusz]   # arkusze ze zrzutami (Playwright)
node tools/export-design-md.mjs [--project nazwa | --config plik] [--input plik] [wyjście]
node link.mjs [--force] [katalog]              # łączy .figma-bridge.json z repo jako projekt (sekcja Projekty)
sh add-token.sh [nazwa]                        # token Figmy ze schowka do data/figma-token[-nazwa].txt
```

`--krok` i `--na-sucho` to polskie odpowiedniki `--step` i `--dry-run`. `--file` (albo zmienna `FIGMA_FILE`) to
klucz pliku Figmy albo fragment nazwy pliku z otwartą wtyczką: zadanie, jego krok planu i projekt dotyczą wtedy
tego pliku. `wait.mjs` i `figma_comments` pobierają zdarzenia z tej samej kolejki, więc każde zdarzenie trafia tylko
do jednego z nich.

## Bezpieczeństwo

- Serwer słucha tylko na `127.0.0.1:8765`. Każde żądanie wymaga tokenu mostu z `data/token.txt` (losowy, plik 0600).
  Ten sam token jest w `app/ui.html` (też 0600), bo wtyczka musi go znać.
- Wtyczka łączy się tylko z `http://localhost:8765`. Działa tylko w pliku, w którym ją uruchomiono, i tylko dopóki
  jej okno jest otwarte. Jej zasięg to Plugin API: warstwy, style, zmienne, komponenty, strony i eksport. Nie widzi
  innych plików (poza opublikowanymi bibliotekami, z których plik może importować), komentarzy, udostępniania ani
  ustawień konta. `enablePrivatePluginApi` w manifeście daje jej klucz pliku (`figma.fileKey`), potrzebny do
  komentarzy.
- Kto zna token mostu i ma dostęp do tego komputera, może wykonać dowolny kod w otwartym pliku. Nie udostępniaj
  `token.txt` ani `ui.html`. Nowy token: usuń `data/token.txt`, uruchom `node install.mjs` i otwórz wtyczkę ponownie.
- Tokeny Figmy (`data/figma-token*.txt`, 0600) służą tylko do czytania komentarzy i odpowiadania w wątkach przez
  `api.figma.com`. Katalog `data/` (treść komentarzy, zrzuty, wyniki, logi) ma prawa 0700.
- `data/logs/server.log` dostaje linię dla każdego zadania: etykieta, plik, czy to próba, wynik i czas, nigdy kod
  ani wynik skryptu. Żądania ze złym tokenem są notowane jako `rejected: bad token on …`, najwyżej raz na minutę.
- W trybie komentarzy działa `claude -p --permission-mode dontAsk --restricted --tools Read,Write,Edit,Glob,Grep
  --strict-mcp-config`. Ma tylko MCP figma-bridge i narzędzia `mcp__figma-bridge__*`, `Read`, `Write`, `Edit`, `Glob`
  i `Grep`, a do tego limit kosztu i czasu. `--restricted` odcina narzędzia uruchamiające kod i WebFetch, pomija
  Twoje pliki ustawień Claude Code (ich reguły `allow` nie poszerzą tej listy) i zamyka operacje na plikach
  w katalogu roboczym: folderze projektu albo `data/scratch/`. Wymaga Claude Code z flagą `--restricted`.
  Ten sam płot obowiązuje w MCP tej sesji: `figma_run {file}` bierze skrypty tylko z katalogu roboczego
  (`BRIDGE_FILE_ROOT`), a wszystkie zadania idą do pliku komentarza (`FIGMA_FILE`). Sesja nie może przełączyć się
  na inny plik (`figma_status {file}` odmawia i nie wymienia innych plików) ani połączyć projektu
  z `.figma-bridge.json`. Bez tego namówiona sesja mogłaby wczytać dowolny plik z dysku jako „skrypt”, wynieść
  jego treść w komunikacie błędu albo zmienić inny otwarty plik.
- Katalog roboczy sesji komentarza jest dla niej zapisywalny. Gdy jest nim folder projektu, namówiona sesja może
  zmienić jego preludia i szablon promptu, czyli wpłynąć na kolejne komentarze i skrypty tego projektu. Trzymaj
  w folderze projektu tylko to, co Claude ma czytać, i przeglądaj zmiany po komentarzach od osób spoza zespołu.
- Treść komentarza trafia do promptu. Gdy słuchanie jest włączone, każdy, kto może komentować plik, może zlecić
  Claude'owi zmianę. Włączaj je tylko w plikach z zaufanymi osobami.

## Odinstalowanie

Z katalogu repo (instalatora nie ma w `app/`):

```sh
node install.mjs --uninstall   # usuwa LaunchAgenta, wpis MCP i app/; data/ i projects/ zostają
node install.mjs --purge       # to samo, a do tego data/ (tokeny, wyniki, logi)
```

`projects/` nigdy nie jest usuwany, bo to Twój materiał. Jeśli instalowałeś z własnym `BRIDGE_HOME`, ustaw tę samą
zmienną. W Figmie usuń wtyczkę w Plugins → Development → Manage plugins in development, a token unieważnij
w Settings → Security.

## Gdy coś nie działa

- **„the Claude Bridge plugin is not open in Figma”** (albo „… in file <klucz>”, gdy sesja pracuje we wskazanym
  pliku): otwórz wtyczkę w tym pliku i nie zamykaj jej okna. Serwer uznaje
  okno za zamknięte, gdy przez 10 s nie czeka ono na zadanie. Zadanie, które okno wzięło i z którym się zamknęło,
  kończy się od razu błędem „okno wtyczki zamknęło się, zanim odesłało wynik”.
- **Okno wtyczki: „Serwer mostu nie działa”**: sprawdź `launchctl print gui/$(id -u)/local.claude-figma-bridge`
  i logi `data/logs/server.log` oraz `server.err`. Restart: `launchctl kickstart -k gui/$(id -u)/local.claude-figma-bridge`
  albo ponownie `node install.mjs`. Komunikat „Port 8765 is taken” w `server.err` oznacza, że działa drugi serwer
  (np. `node server.mjs` uruchomiony ręcznie).
- **Okno wtyczki: „Most odrzucił połączenie (401)”**: wtyczka ma inny token niż serwer. Zaimportuj ją
  z `app/manifest.json` w katalogu mostu (nie z repo), zamknij jej okno i otwórz ponownie.
- **Figma: „Unable to load code … no such file or directory … ui.html”**: wtyczka jest zaimportowana z manifestu
  w repo, a nie z `app/manifest.json` w katalogu mostu (instalator ostrzega o tym na końcu). Zaimportuj ją
  z `app/manifest.json`: w oknie wyboru pliku `Cmd+Shift+G` pozwala wkleić ścieżkę do `~/Library/…`. Starą usuń
  w Plugins → Development → Manage plugins in development.
- **Brak narzędzi figma_* w Claude Code**: `claude mcp list` powinien pokazać `figma-bridge`. Jeśli go nie ma,
  uruchom `node install.mjs` i zacznij nową sesję.
- **TCC i `~/Documents`**: instalator nie przyjmie `BRIDGE_HOME` w `~/Documents`, `~/Desktop`, `~/Downloads`,
  iCloud Drive, folderach chmurowych ani na dyskach zewnętrznych. Z tego samego powodu Claude w trybie komentarzy
  nie odczyta tam plików, więc potrzebny mu materiał trzymaj w folderze projektu.
- **Komentarze: `figma_status` pokazuje `comment polling: wyłączone (brak figma-token.txt)`**: uruchom `add-token.sh`.
- **`błąd: <klucz pliku>: HTTP 403 (token bez zakresu file_comments albo bez dostępu do pliku)`**: żaden token nie
  sięga tego pliku. Utwórz token z zakresem File comments z odczytem i zapisem, na koncie z dostępem do pliku
  (drugie konto: `add-token.sh <nazwa>`). Token tylko z odczytem czyta komentarze, ale odpowiedzi w wątkach się
  nie udają. Jeśli to plik z `files` projektu, do którego nie masz już dostępu, usuń go z tej listy.
- **`HTTP 429 (limit zapytań, przerwa do GG:MM)`**: serwer co 15 s pyta o komentarze plików, w których wtyczka
  działała w ostatnich 30 minutach, i wszystkich plików z `files` w projektach, więc ogranicz tę listę. Po 429
  zostawia plik w spokoju na czas podany przez Figmę (`Retry-After`), a bez niego na minutę, potem dwie, cztery,
  najwyżej godzinę.
- **Okno wtyczki: „Krok przekroczył czas”**: skrypt nie odesłał wyniku w swoim `timeoutMs`. Jeśli Figma nie
  reaguje, skrypt wciąż liczy: dodaj w jego pętlach `await breathe()` albo daj mu więcej czasu.
- **`figma_status` pokazuje `link: …`**: `.figma-bridge.json` z tego repo nie został połączony. Linia mówi
  dlaczego i jak to nadpisać (`link.mjs --force`).
- **Claude nie reaguje na komentarz**: sprawdź notkę pod przełącznikiem, czy wtyczka jest otwarta w tym pliku, czy
  komentarz zaczyna nowy wątek i czy powstał po włączeniu słuchania. Stan `pominięte: limit 6/h` w planie oznacza
  godzinny limit. Przy stanie `nieudane` szukaj linii `agent #N` w `data/logs/server.log`. Jeśli `claude` zmienił
  miejsce, uruchom `node install.mjs` ponownie, bo LaunchAgent zna tylko `PATH` z chwili instalacji.

## Rozwój

- `npm test` uruchamia `node --test test/*.test.mjs`. Testy używają atrapy Plugin API (`test/mock-figma.mjs`),
  tymczasowego `BRIDGE_HOME` oraz udawanych `claude` i `launchctl`. Nie potrzebują sieci ani Figmy.
  `test/security.test.mjs` trzyma kontrakt bezpieczeństwa według nagłówków OWASP Top 10, a `test/ui.test.mjs`
  uruchamia skrypt okna wtyczki na prawdziwym serwerze.
- Zmiany z repo trafiają do działającego mostu przez `node install.mjs`. Po zmianach w `code.js`,
  `ui.template.html` albo `manifest.json` otwórz wtyczkę ponownie.
- Bez zainstalowanego katalogu mostu `node server.mjs` w repo używa samego repo jako katalogu mostu (`data/`
  i `ui.html` są w `.gitignore`), a wtyczkę importuje się z `manifest.json` w repo. Gdy katalog mostu istnieje,
  skrypty uruchomione z repo korzystają z niego.
- Zmienne środowiskowe: `BRIDGE_HOME` (katalog mostu), `FIGMA_FILE` (plik sesji MCP, `run.mjs` i `plan.mjs`),
  `BRIDGE_FILE_ROOT` (jedyny folder, z którego MCP bierze skrypty; ustawia go tryb komentarzy),
  `BRIDGE_AGENT_*` (limity trybu komentarzy), `BRIDGE_NO_AUTOSTART=1` (MCP nigdy nie uruchamia serwera sam).
  Tylko do testów: `BRIDGE_PORT` (manifest pozwala wyłącznie na 8765) i `BRIDGE_FIGMA_API`.
- Poprawka albo nowa funkcja zaczyna się od testu, który pada z właściwego powodu. Endpointy serwera i model
  okien wtyczki opisuje [AGENTS.md](AGENTS.md).
- Repo pozostaje ogólne: bez nazw projektów, kluczy plików ani materiałów konkretnego projektu. Takie rzeczy trzymaj
  w `projects/`.
- Wskazówki dla agentów piszących kod albo pracujących w Figmie są w [AGENTS.md](AGENTS.md).
