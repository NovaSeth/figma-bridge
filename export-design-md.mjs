// Składa DESIGN.md (format Stitch / google-labs-code/design.md) z danych odczytanych z Figmy.
// Użycie: node run.mjs jobs/ds-90-export.js > out/ds-export.json && node export-design-md.mjs [plik-wyjściowy]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(readFileSync(join(here, 'out/ds-export.json'), 'utf8')).result;
const components = JSON.parse(readFileSync(join(here, 'ds-components.json'), 'utf8'));
const outFile = process.argv[2] || join(here, 'out/DESIGN.md');
const WEIGHT = { Regular: 400, Medium: 500, 'Semi Bold': 600, Bold: 700, 'Extra Bold': 800 };
const q = s => JSON.stringify(String(s));
const flat = s => String(s).replace(/\//g, '-');            // Tailwind i DTCG nie przyjmują ukośnika; w Figmie zostaje grupa
const flatRefs = s => String(s).replace(/\{typography\.([^}]+)\}/g, (_, n) => '{typography.' + flat(n) + '}');
const y = [];
y.push('---', 'version: alpha', 'name: FLibrus', 'description: ' + q('Prywatny klient Librusa dla rodziców. iOS-owe zgrupowane listy, tonalne komponenty Material 3, czarny przycisk główny. Odpowiedź zamiast dashboardu.'));
y.push('colors:'); for (const [k, v] of Object.entries(d.colors)) y.push(`  ${k}: ${q(v.value)}`);
y.push('typography:'); for (const t of d.typography) { y.push(`  ${flat(t.name)}:`, `    fontFamily: ${t.fontFamily}`, `    fontSize: ${t.fontSize}px`, `    fontWeight: ${WEIGHT[t.style] || 400}`, `    lineHeight: ${Math.round(t.lineHeight) / 100}`); if (t.letterSpacing) y.push(`    letterSpacing: ${Math.round(t.letterSpacing * 10) / 1000}em`); }
y.push('rounded:'); for (const [k, v] of Object.entries(d.rounded).sort((a, b) => a[1].value - b[1].value)) y.push(`  ${q(k)}: ${v.value}px`);
y.push('spacing:'); for (const [k, v] of Object.entries(d.spacing).sort((a, b) => a[1].value - b[1].value)) y.push(`  ${q(k)}: ${v.value}px`);
y.push('components:'); for (const [name, props] of Object.entries(components)) { y.push(`  ${name}:`); for (const [k, v] of Object.entries(props)) y.push(`    ${k}: ${q(flatRefs(v))}`); }
y.push('---', '');
const table = (head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
const comp = n => d.components.find(c => c.name === n) || { description: '', variants: [], properties: [] };
const b = [];
b.push('## Overview', '', 'FLibrus to prywatny klient Librusa dla dwojga zapracowanych rodziców, używany wieczorem na iPhonie. Zasada nadrzędna: **odpowiedź, nie dashboard**. Ekran „Teraz" otwiera tonalna karta ze zdaniem policzonym z danych i prawdziwym postępem, pod nią to, co wymaga rodzica, potem to, co warto wiedzieć, na końcu ogłoszenia.', '',
  'Język wizualny łączy trzy znane wzorce: **Apple** (zgrupowane listy w kartach na szarym tle, separatory z wcięciem, kafle ikon jak w Ustawieniach, arkusze dolne), **Material 3** (tonalne kontenery, chipy, pigułka aktywnej zakładki, ikony Material Icons) i **Uber** (jeden czarny przycisk główny, wysoki kontrast, mało koloru).', '',
  'System jest zbudowany atomowo w Figmie (strona „Design System": Fundamenty → Atomy → Molekuły → Organizmy). Ten plik jest eksportem tamtych zmiennych, stylów i komponentów. Makiety ekranów: strona „Mockupy", rama 402 × 874 px (iPhone 16 Pro).', '');
b.push('## Colors', '', 'Neutralna baza, jeden akcent (`primary`), czerń tylko na przycisku głównym (`inverse-surface`). Pomarańcz, zieleń i czerwień to kolory stanów: każdy ma jedno znaczenie i zawsze idzie z tekstem lub ikoną. Wszystkie pary tło/tekst spełniają WCAG AA (min. 4,5:1).', '',
  table(['Token', 'Jasny', 'Ciemny', 'Zmienna CSS', 'Rola'], Object.entries(d.colors).map(([k, v]) => ['`' + k + '`', '`' + v.value + '`', '`' + (d.colorsDark[k] ? d.colorsDark[k].value : '') + '`', '`' + (v.css || '').replace(/^var\(|\)$/g, '') + '`', v.description])), '',
  'Motyw ciemny ma te same nazwy tokenów (kolekcja „Color Dark" w Figmie). Przycisk główny odwraca się: biały z czarnym tekstem. iOS-owy niebieski `#007AFF` jest zakazany jako kolor tekstu (4,0:1 na bieli).', '');
b.push('## Typography', '', 'Jeden krój: **Inter** w makietach, w aplikacji font systemowy (SF Pro na iOS, Roboto na Androidzie). Hierarchię buduje waga i rozmiar, nie kolor. Bez wersalików z trackingiem.', '',
  table(['Styl (DESIGN.md / Figma)', 'Rozmiar / interlinia', 'Waga', 'Zastosowanie'], d.typography.map(t => ['`' + flat(t.name) + '` / `' + t.name + '`', t.fontSize + ' px / ' + Math.round(t.lineHeight) + '%', String(WEIGHT[t.style] || 400), t.description])), '',
  'Tytuł nieprzeczytanego elementu to `title-md` z niebieską kropką, przeczytanego `title-md-read` bez kropki.', '');
b.push('## Layout', '', 'Ekran ma 402 px szerokości, margines boczny 16 px (`spacing.lg`), karty na całą szerokość treści (370 px). Sekcje dzieli 26 px, karty w liście 10 px. Cele dotyku min. 44 × 44 px (`size.touch`).', '',
  table(['Token', 'Wartość'], Object.entries(d.spacing).sort((a, b2) => a[1].value - b2[1].value).map(([k, v]) => ['`spacing.' + k + '`', v.value + ' px'])), '',
  '- **Dolna nawigacja jest zawsze przyklejona do dołu ekranu**, także gdy treść jest krótka.',
  '- **Ekrany przykrywające** (Ustawienia, Frekwencja) zasłaniają nagłówek aplikacji i nawigację. Mają tylko tytuł i przycisk „X".',
  '- **Arkusz dolny** otwiera się na 64% wysokości, przewinięcie treści rozwija go na pełny ekran.',
  '- Kolejność sekcji na „Teraz": Wymaga Twojego działania → Po terminie (osobna sekcja z takim samym nagłówkiem) → Warto wiedzieć → Ogłoszenia.',
  '- Długie listy z czasem (Frekwencja) dostają przełącznik Miesiąc/Rok i nawigację po okresie nad kartą KPI, która zmienia się razem z okresem.', '');
b.push('## Elevation & Depth', '', 'Interfejs jest płaski: karty leżą na szarym tle bez cienia, jak zgrupowane listy iOS. Cień oznacza wyłącznie wyniesienie nad treść.', '',
  table(['Styl', 'Warstwy', 'Gdzie'], d.elevation.map(e => ['`' + e.name + '`', e.layers.map(l => `0 ${l.y}px ${l.blur}px rgba(0,0,0,${l.alpha})`).join(', '), e.name.endsWith('menu') ? 'Lista dzieci rozwijana spod imienia' : 'Przycisk pływający („Napisz", „Dodaj zajęcia")'])), '',
  'Arkusze i lista dzieci przyciemniają tło czernią 42%. Szkło i poświaty są zakazane.', '');
b.push('## Shapes', '', table(['Token', 'Wartość', 'Gdzie'], [['xs', 'Chipy w kalendarzu miesięcznym'], ['sm', 'Chipy'], ['md', 'Przyciski, przełącznik segmentowy'], ['lg', 'Pola formularzy, banery, cytat'], ['xl', 'Karty list, karta akcji, menu'], ['2xl', 'Karta podsumowania, górne rogi arkusza'], ['full', 'Awatary, liczniki, pigułka zakładki, przełącznik']].map(([k, where]) => ['`rounded.' + k + '`', d.rounded[k].value + ' px', where])), '', 'Kafel ikony ma stały promień 9 px (jak w Ustawieniach iOS). Promień niesie informację o rodzaju elementu, nie jest dekoracją.', '');
b.push('## Components', '', 'Atomy → molekuły → organizmy. Nazwy jak w Figmie, tokeny w nagłówku pliku (`components`).', '');
const groups = [['Atomy', ['Button', 'Chip', 'Avatar', 'Badge', 'Unread dot', 'Checkbox', 'Switch', 'Icon tile', 'Divider']], ['Molekuły', ['Section heading', 'List row', 'Action card', 'Summary card', 'Segmented control', 'Tab item', 'Text field', 'Banner', 'Date nav']], ['Organizmy', ['App header', 'Tab bar', 'Bottom sheet', 'Child menu', 'Cover top bar']]];
for (const [g, names] of groups) { b.push('### ' + g, ''); for (const n of names) { const c = comp(n); b.push('**' + n + '**' + (c.variants.length ? ' (' + c.variants.join(' · ') + ')' : '') + '. ' + c.description + (c.properties.length ? ' Właściwości: ' + c.properties.join(', ') + '.' : ''), ''); } }
b.push('**Icon.** Ikonografia to **Material Icons** (Material Design), ' + d.icons.length + ' komponentów wektorowych 24 px: ' + d.icons.map(i => '`' + i + '`').join(', ') + '. Rozmiary: 16 (chipy), 20 (kafle), 24 (wiersze, nawigacja), 28 (ustawienia, strzałka przy imieniu). Na iOS odpowiednikiem są SF Symbols.', '');
b.push("## Do's and Don'ts", '',
  '**Rób**', '',
  '- Pisz po ludzku i konkretnie po polsku: „Na poniedziałek 2 zadania", nie „Twoje centrum nauki". Nazwy z Librusa zostają bez zmian.',
  '- Pokazuj tylko prawdziwe liczby i dane. Pusty stan mówi, dlaczego jest pusty i co dalej.',
  '- Szewron stawiaj zawsze na środku wysokości wiersza i tylko tam, gdzie wiersz dokądś prowadzi (arkusz dolny albo ekran).',
  '- Datę i rolę nadawcy pokazuj jako chip. Reguła terminu: po terminie = ostrzegawczy + ikona `error`, dziś = zielony, przyszły = neutralny.',
  '- Nieprzeczytane oznaczaj niebieską kropką i pogrubieniem, a na przełączniku folderów licznikiem.',
  '- Odświeżaj przeciągnięciem listy w dół. Stan danych i ręczne odświeżanie mieszkają w Ustawieniach.',
  '- Jedna akcja główna na kartę lub arkusz (czarny przycisk), reszta jako przyciski drugorzędne.', '',
  '**Nie rób**', '',
  '- Nie pisz w interfejsie o „prototypie", „symulacji" ani „planie przykładowym". To makieta działającego systemu: przycisk nazywa się „Wyślij".',
  '- Nie używaj czarnej karty podsumowania ani innych dużych czarnych powierzchni. Czerń jest tylko na przycisku głównym.',
  '- Nie dodawaj przycisku „Zamknij" w arkuszu dolnym ani ikony odświeżania w nagłówku.',
  '- Nie buduj wiersza-pudełka, pod którym wiszą kolejne pudełka. Grupę otwiera nagłówek sekcji.',
  '- Bez gradientów, poświat, szkła, emoji, „AI sparkle", pigułek „beta", wykresów dla ozdoby i martwych kontrolek.',
  '- Bez półpauz i pauz w tekście interfejsu. Metadane łącz przecinkiem.', '');
writeFileSync(outFile, y.join('\n') + b.join('\n'));
console.log('zapisano', outFile);
