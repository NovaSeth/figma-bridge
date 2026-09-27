# Claude Bridge — ocena po pierwszym dużym projekcie

Spisane 20 września 2026, po iteracji, w której przez most przeszło ponad 300 zadań:
przeniesienie 34 makiet FLibrus na system projektowy, zbudowanie motywu ciemnego
i zamknięcie 106 wątków komentarzy.

To jest moja ocena narzędzia, które sam napisałem — więc staram się być wobec niego
surowszy niż wobec cudzego.

---

## Co działa

**Rdzeń: jedno zadanie = cała operacja.**
Skrypt dostaje `figma`, `shot()` i `progress()`, i robi w pliku co chce. Przepięcie
6085 wypełnień na kolekcję ciemną to był jeden przebieg. Przy narzędziu rozliczanym
za wywołanie myślałbym w małych porcjach i ta operacja zająłaby godziny.

**Zrzut w tej samej turze.**
`await shot(node, { scale: 1, name: 'x' })` dokleja PNG do wyniku zadania. Nie ma
osobnego kroku „a teraz pokaż mi, co zrobiłeś". Przy kilkuset iteracjach to różnica
nie do przecenienia — i to właśnie ta funkcja, a nie API Figmy, decydowała o tempie.

**Widoczny stan.**
`plan.mjs` plus `progress()` sprawiają, że w oknie widać listę kroków i pasek postępu.
Michał kilka razy zaglądał tam zamiast pytać. Kiedy okno skłamało („Analizuję" przy
kroku, którego nie odhaczyłem), było to od razu widać — i dlatego dało się naprawić.

**Brak limitu.**
Figma MCP na planie Starter to 20 wywołań miesięcznie. Most nie ma limitu, bo to
zwykła wtyczka deweloperska rozmawiająca z lokalnym serwerem.

**Sprzątanie po błędzie.**
`code.js` zapamiętuje dzieci strony przed uruchomieniem skryptu i po wyjątku usuwa
te, które zostały niewstawione. Dodane po tym, jak na stronie zostały trzy osierocone
węzły po skrypcie, który padł w połowie.

---

## Co nie działa

### 1. Komentarze to proteza

Plugin API nie widzi komentarzy. Czytam je przez REST, a **zamykam klikając w Chrome**,
bo REST-owy `/comments` nie ma endpointu do rozwiązywania wątku. To najsłabszy element
całego układu: dziesiątki przełączeń do przeglądarki, klikanie w ptaszki po
współrzędnych, każdorazowa weryfikacja przez REST, czy się udało.

**Jak poprawić:** nie da się w pełni — Figma po prostu nie wystawia tego w API.
Co da się zrobić:
- Zamykanie partiami po 3–5 z jedną weryfikacją zamiast jednej na wątek.
- Skrypt, który przyjmuje listę ID i klika po nich w pętli w Chrome, zamiast
  robienia tego ręcznie za każdym razem.
- Rozważyć plugin Figmy działający w trybie „review", gdzie komentarze zastąpiłyby
  adnotacje na kanwie (widoczne dla Plugin API). To zmienia proces, więc tylko gdyby
  klikanie naprawdę zaczęło boleć.

### 2. Plan zależał od mojej pamięci — naprawione

Dwa razy w tej sesji okno pokazywało „Analizuję" przy krokach, które dawno były
zrobione, bo odhaczałem je ręcznie przez `plan.mjs` i zapominałem. Raz Michał musiał
o tym powiedzieć, drugi raz też.

**Naprawione:** `run.mjs` przyjmuje `--krok "tekst"`. Przed uruchomieniem oznacza
pozycję planu jako w toku, po udanym przebiegu jako zrobioną, a po błędzie **zostawia
w toku**. Plan przestaje zależeć od tego, co pamiętam.

W oknie doszedł też bezpiecznik: po pięciu minutach bez ruchu „Analizuję" zmienia się
w „Krok czeka na mnie", pasek przestaje udawać postęp. Nie zastępuje wiązania kroków,
ale nie pozwala oknu kłamać dłużej niż przez chwilę.

### 3. Wymaga człowieka przy komputerze

Okno wtyczki musi być otwarte w aplikacji desktopowej. Raz zostało zamknięte i wszystko
stanęło — bez żadnego komunikatu po mojej stronie poza timeoutem.

**Jak poprawić:** `run.mjs` powinien rozróżniać „wtyczka nie odebrała zadania w ciągu
N sekund" od „zadanie trwa długo" i mówić wprost: *uruchom wtyczkę ponownie*. Dziś
oba przypadki wyglądają tak samo.

### 4. Brak siatki bezpieczeństwa przy zapisie

Zły selektor psuje plik natychmiast i nieodwracalnie z poziomu API. W tej iteracji:

| Co się stało | Skąd |
|---|---|
| Formularz nowej wiadomości zniknął z 4 ekranów | skrypt usuwał blok z tytułem, a formularz był jego rodzeństwem |
| 68 wierszy list dostało niepotrzebny odstęp | selektor „rząd samych chipów" łapał też sloty wewnątrz wierszy |
| Ekran Frekwencji zwęził się do 97 px | zmiana wyrównania na kontenerze, który hugował szerokość |
| Nagłówek „Twoja odpowiedź" zamienił się w komponent dnia kalendarza | podmiana po nazwie warstwy „Bold Text" |
| Tło 34 ekranów zostało jasne w motywie ciemnym | `frame.findAll()` nie zwraca samej ramki |

Wszystko wyłapane i cofnięte, ale **każdy z tych błędów znalazł człowiek albo agent
oglądający zrzut, nie most.**

**Jak poprawić — w kolejności wartości:**

1. **Tryb próbny.** `run.mjs jobs/x.js --na-sucho` uruchamia skrypt, zbiera listę
   węzłów, które zostałyby zmienione lub usunięte, i zwraca ją bez zapisu. Przy
   operacjach masowych to jedna komenda różnicy, a ratuje przed wszystkimi pięcioma
   wpadkami z tabeli powyżej.
2. **Próg bezpieczeństwa.** Jeśli skrypt chce usunąć więcej niż N węzłów albo tknąć
   więcej niż M procent drzewa, wymaga jawnej flagi `--pozwalam`. Zniknięcie formularza
   z czterech ekranów zatrzymałoby się na tym progu.
3. **Zrzut przed i po.** Dla listy nazw ekranów automatycznie zrób zrzut przed
   uruchomieniem i po, i policz różnicę pikseli. Skok powyżej progu = ostrzeżenie
   w wyniku zadania. Wyłapałby zniknięty formularz od razu, bez czekania na agenta.
4. **Kopia strony.** `node snapshot-page.mjs` duplikujące stronę przed ryzykowną serią.
   Prymitywne, ale daje cofnięcie, którego API nie daje.

### 5. Audyty mają te same ślepe plamki co skrypty

Mój audyt zgodności z DS przez wiele godzin raportował „0 kolorów spoza tokenów",
bo chodził po `frame.findAll()` — czyli nigdy nie sprawdzał samej ramki. Wyszło to
dopiero przy motywie ciemnym, gdy 34 tła zostały jasne.

**Jak poprawić:** każdy walidator ma iterować po `[węzeł, ...węzeł.findAll()]`.
Warto dopisać do audytu test własny: celowo zepsuć jeden węzeł, sprawdzić, czy
walidator go widzi, cofnąć. Walidator, który nigdy nic nie znalazł, jest podejrzany.

### 6. Klonowanie wariantów gubi powiązania właściwości

`component.clone()` w zestawie wariantów nie przenosi `componentPropertyReferences`.
Instancje po cichu ignorują `setProperties` i pokazują tekst domyślny. Zgubiłem na tym
godzinę przy rozszerzaniu `Chip` o rozmiar `Compact`.

**Jak poprawić:** helper `sklonujWariant(set, wzor, nazwa)` w `jobs/_ds.js`, który
klonuje i od razu przypisuje referencje z powrotem. Nigdy nie wołać `clone()` na
wariancie bezpośrednio.

---

## Co można zrobić lepiej

**Prelude zamiast powtarzania.**
Prawie każdy skrypt zaczyna się tym samym: znajdź stronę, ustaw ją, wczytaj fonty,
zbuduj mapę zmiennych, napisz `paint()`. `jobs/_ds.js` to ma, ale nie używałem go
konsekwentnie i połowa skryptów powtarza te 15 linii. Jeden prelude, wstrzykiwany
przez `run.mjs`, skróciłby każdy skrypt o jedną trzecią.

**Skrypty jako biblioteka, nie jako śmietnik.**
`jobs/gen/` ma teraz ponad sto plików o nazwach `fix92.js`, `darkFix2.js`, `fixReszta.js`.
Kilka z nich to narzędzia, do których wracałem wielokrotnie — `ukladaj.js`,
`walidujDS2.js`, `auditFinal.js`, `fixOverlay.js`, `exportOba.js`. Powinny wyjechać
do `tools/` z nazwami mówiącymi co robią, a `jobs/gen/` można czyścić bez żalu.

**Logi zadań.**
Serwer nie trzyma historii poza `events.jsonl`. Przy pytaniu „kiedy zniknął ten
formularz" nie miałem czego przeszukać — musiałem zgadywać z pamięci, który skrypt
to zrobił. Zapis `{ czas, skrypt, wynik, liczba zmienionych węzłów }` do pliku
rozwiązałby to jedną linijką.

**Okno: druga linia mówi za mało.**
Pokazuje „3 z 7 kroków · 42%". Przy zadaniu trwającym minutę przydałoby się, co
konkretnie się dzieje — ale bez nazwy zadania, bo o to była wyraźna prośba. Coś
w rodzaju „przebudowuję 12 ekranów" byłoby zbiorcze i konkretne naraz.

---

## Co można zrobić w przyszłości

**Eksport DESIGN.md z pliku, nie z ledgera.**
`ds-components.json` jest dziś ręcznie utrzymywanym odwzorowaniem systemu i już się
rozjechał (brakuje `Day ring`, `Calendar day`, osi `Size` w `Chip`, stylu
`Primary outline`). Generator powinien czytać komponenty, ich opisy i powiązania
tokenów **prosto z pliku** i składać z tego DESIGN.md. Wtedy dokument nigdy nie
kłamie, a ledger znika.

**Ciągła walidacja zamiast walidacji na żądanie.**
`walidujDS2.js` uruchamiam ręcznie. Mógłby chodzić po każdej serii zapisów i dopisywać
wynik do wyniku zadania — „system: 0 błędów" albo „system: 2 nowe". Koszt: jeden
przebieg po drzewie. Zysk: nie da się zostawić systemu w gorszym stanie niż się go
zastało.

**Przegląd zrzutów jako część mostu.**
Największym wąskim gardłem nie było API, tylko sprawdzanie, czy zmiana wygląda dobrze.
Rozwiązywałem to eksportem PNG i równoległymi agentami. To mogłoby być komendą:
`node przeglad.mjs "Jasny motyw" --partie 3`, która eksportuje, dzieli i odpala
agentów z gotowym zestawem reguł.

**Wersjonowanie systemu.**
Przy każdej zmianie komponentu zapisywać krótki wpis: co, dlaczego, na czyją prośbę
(numer komentarza). Dziś ta wiedza jest w wątkach komentarzy i w mojej pamięci sesji.
Plik `DS-CHANGELOG.md` dopisywany automatycznie przez skrypty zmieniające DS byłby
tańszy niż odtwarzanie tego później.

**Dwukierunkowość.**
Most dziś tylko pisze do Figmy. Odczyt w drugą stronę — z Figmy do kodu — robi lepiej
Figma MCP (Code Connect, `get_design_context`). Nie ma sensu tego przepisywać; warto
raczej używać obu: mostu do masowej edycji, MCP do handoffu, jeśli kiedyś plan przestanie
ograniczać liczbę wywołań.

---

## Werdykt

Most sprawdził się w tym, do czego powstał: masowa, powtarzalna chirurgia na tysiącach
węzłów w pętli z komentarzami człowieka. Jego przewaga nad Figma MCP jest w połowie
merytoryczna (operacje wsadowe, zrzuty w tej samej turze, widoczny stan), a w połowie
okolicznościowa (limit 20 wywołań na planie Starter).

Jego największa słabość nie jest techniczna, tylko procesowa: **pozwala zepsuć plik
szybciej, niż da się to zauważyć.** Tryb próbny i próg bezpieczeństwa to dwie zmiany,
które dałyby najwięcej — więcej niż jakakolwiek nowa funkcja.
