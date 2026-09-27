//# DS P1: zmienne, style tekstu i cienie
const TOKENS = {
  "primitives": {
    "neutral/0": "#FFFFFF", "neutral/50": "#F9F9FB", "neutral/100": "#F2F2F7", "neutral/150": "#EDEDF2", "neutral/200": "#E3E3E8", "neutral/500": "#80868B", "neutral/600": "#5F6368", "neutral/900": "#111113", "neutral/1000": "#000000",
    "neutral-dark/100": "#A8A8AE", "neutral-dark/200": "#8E8E93", "neutral-dark/600": "#38383A", "neutral-dark/700": "#2C2C2E", "neutral-dark/800": "#1C1C1E", "neutral-dark/850": "#161618",
    "blue/100": "#D3E3FD", "blue/300": "#8AB4F8", "blue/600": "#0B57D0", "blue/800": "#0A3A86", "blue/900": "#062E6F", "blue/950": "#041E49", "blue-gray/200": "#B3C7EE", "blue-gray/600": "#3C4A63",
    "orange/100": "#FFE8CF", "orange/300": "#FFC78A", "orange/400": "#FFB86B", "orange/600": "#B85C00", "orange/800": "#8A4200", "orange/900": "#4A2A00",
    "green/100": "#CEEAD6", "green/200": "#A8DAB5", "green/300": "#81C995", "green/700": "#137333", "green/800": "#0D652D", "green/900": "#0F5223",
    "red/200": "#F2B8B5", "red/300": "#F28B82", "red/600": "#C5221F", "red/700": "#B3261E"
  },
  "semantic": [
    ["primary", "blue/600", "blue/300", "fg+bg", "--tint", "Akcent: linki, fokus, zaznaczenie, kropka nieprzeczytanych"],
    ["on-primary", "neutral/0", "blue/900", "fg", "--on-tint", "Treść na primary"],
    ["primary-container", "blue/100", "blue/800", "bg", "--tonal", "Karta podsumowania, awatary, aktywna zakładka, bloki lekcji"],
    ["on-primary-container", "blue/950", "blue/100", "fg", "--on-tonal", "Treść na primary-container"],
    ["summary-secondary", "blue-gray/600", "blue-gray/200", "fg", "--hero-sec", "Tekst pomocniczy na karcie podsumowania"],
    ["background", "neutral/100", "neutral/1000", "bg", "--bg", "Tło aplikacji"],
    ["surface", "neutral/0", "neutral-dark/800", "bg", "--card", "Karty, listy, arkusze"],
    ["surface-bar", "neutral/50", "neutral-dark/850", "bg", "--bar", "Dolny pasek zakładek"],
    ["on-surface", "neutral/900", "neutral/0", "fg", "--ink", "Tekst główny i ikony"],
    ["on-surface-variant", "neutral/600", "neutral-dark/100", "fg", "--sec", "Tekst pomocniczy, szewrony"],
    ["outline", "neutral/500", "neutral-dark/200", "stroke", "--ring", "Obrys pól i kółka zadania"],
    ["outline-variant", "neutral/200", "neutral-dark/600", "stroke", "--sep", "Separatory"],
    ["neutral-container", "neutral/150", "neutral-dark/700", "bg", "--chip", "Chip neutralny, przycisk drugorzędny, tło przełącznika"],
    ["warning", "orange/800", "orange/300", "fg", "--due", "Tekst chipa po terminie"],
    ["warning-container", "orange/100", "orange/900", "bg", "--due-bg", "Tło chipa po terminie"],
    ["warning-strong", "orange/600", "orange/400", "bg", "--warn", "Kafel ikony ostrzegawczej"],
    ["success", "green/700", "green/300", "fg+bg", "--ok", "Wartości pozytywne, kafel frekwencji"],
    ["success-container", "green/100", "green/900", "bg", "--extra-bg", "Chip terminu na dziś, komunikat powodzenia"],
    ["on-success-container", "green/800", "green/200", "fg", "--extra", "Treść na success-container"],
    ["error", "red/700", "red/200", "fg+stroke", "--err", "Błąd walidacji"],
    ["badge", "red/600", "red/300", "bg", "--badge", "Licznik spraw i nieprzeczytanych"],
    ["on-badge", "neutral/0", "neutral/1000", "fg", "--on-badge", "Treść licznika"],
    ["inverse-surface", "neutral/1000", "neutral/0", "bg", "--cta", "Przycisk główny i przycisk pływający"],
    ["on-inverse-surface", "neutral/0", "neutral/1000", "fg", "--on-cta", "Treść przycisku głównego"]
  ],
  "spacing": { "2xs": 2, "xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 20, "2xl": 24, "3xl": 32 },
  "radius": { "xs": 4, "sm": 8, "md": 12, "lg": 14, "xl": 20, "2xl": 24, "full": 999 },
  "size": { "icon-sm": 16, "icon-md": 20, "icon-lg": 24, "touch": 44, "avatar": 44, "screen-width": 402 },
  "typography": [
    ["headline-lg", "Extra Bold", 28, 110, -2.2, "Imię dziecka w nagłówku"],
    ["headline-md", "Extra Bold", 24, 120, -2, "Tytuł ekranu i arkusza"],
    ["headline-sm", "Extra Bold", 20, 118, -1.5, "Zdanie na karcie podsumowania, tytuł kalendarza"],
    ["title-lg", "Bold", 20, 120, -1, "Nagłówek sekcji"],
    ["title-md", "Semi Bold", 17, 130, 0, "Tytuł wiersza i karty"],
    ["title-md-read", "Regular", 17, 130, 0, "Tytuł wiersza przeczytanego"],
    ["body-lg", "Regular", 17, 155, 0, "Treść wiadomości i ogłoszenia"],
    ["body-md", "Regular", 16, 140, 0, "Tekst na karcie podsumowania, pola formularzy"],
    ["body-sm", "Regular", 15, 135, 0, "Podtytuły, metadane"],
    ["label-lg", "Semi Bold", 15, 130, 0, "Przyciski"],
    ["label-md", "Semi Bold", 13, 140, 0, "Chipy, nadtytuły"],
    ["label-sm", "Semi Bold", 11, 130, 0, "Zakładki, chipy w kalendarzu"],
    ["caption", "Regular", 13, 145, 0, "Stopki i objaśnienia"]
  ],
  "elevation": {
    "menu": [[0, 12, 32, 0.22], [0, 1, 2, 0.1]],
    "fab": [[0, 6, 18, 0.3]]
  }
}
;
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const allVars = await figma.variables.getLocalVariablesAsync();
const collection = name => cols.find(c => c.name === name) || (c => (cols.push(c), c))(figma.variables.createVariableCollection(name));
const variable = (col, name, type) => allVars.find(v => v.variableCollectionId === col.id && v.name === name) || (v => (allVars.push(v), v))(figma.variables.createVariable(name, col, type));
const SCOPES = { bg: ['FRAME_FILL', 'SHAPE_FILL'], fg: ['TEXT_FILL', 'SHAPE_FILL'], stroke: ['STROKE_COLOR', 'SHAPE_FILL'], 'fg+bg': ['TEXT_FILL', 'SHAPE_FILL', 'FRAME_FILL'], 'fg+stroke': ['TEXT_FILL', 'STROKE_COLOR', 'SHAPE_FILL'] };
const summary = {};

progress(0.05, 'Prymitywy');
const prim = collection('Primitives'); prim.renameMode(prim.modes[0].modeId, 'Value');
const P = {};
for (const [name, value] of Object.entries(TOKENS.primitives)) { const v = variable(prim, name, 'COLOR'); v.setValueForMode(prim.modes[0].modeId, hex(value)); v.scopes = []; v.setVariableCodeSyntax('WEB', 'var(--prim-' + name.replace('/', '-') + ')'); P[name] = v; }
summary.Primitives = Object.keys(P).length;

progress(0.3, 'Kolory semantyczne');
for (const [colName, idx, modeName] of [['Color', 1, 'Light'], ['Color Dark', 2, 'Dark']]) {
  const c = collection(colName); c.renameMode(c.modes[0].modeId, modeName);
  for (const row of TOKENS.semantic) { const [name, , , scope, css, desc] = row; const v = variable(c, 'color/' + name, 'COLOR');
    v.setValueForMode(c.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: P[row[idx]].id }); v.scopes = SCOPES[scope]; v.setVariableCodeSyntax('WEB', 'var(' + css + ')'); v.description = desc + (idx === 2 ? ' (motyw ciemny)' : ''); }
  summary[colName] = TOKENS.semantic.length;
}

progress(0.55, 'Odstępy, promienie, rozmiary');
const size = collection('Size'); size.renameMode(size.modes[0].modeId, 'Value');
const num = (group, scopes, prefix) => { for (const [k, val] of Object.entries(TOKENS[group])) { const v = variable(size, group + '/' + k, 'FLOAT'); v.setValueForMode(size.modes[0].modeId, val); v.scopes = scopes; v.setVariableCodeSyntax('WEB', 'var(--' + prefix + '-' + k + ')'); } };
num('spacing', ['GAP'], 'space'); num('radius', ['CORNER_RADIUS'], 'radius'); num('size', ['WIDTH_HEIGHT'], 'size');
summary.Size = Object.keys(TOKENS.spacing).length + Object.keys(TOKENS.radius).length + Object.keys(TOKENS.size).length;

progress(0.75, 'Style tekstu');
const textStyles = await figma.getLocalTextStylesAsync();
for (const [name, style, fontSize, lh, ls, desc] of TOKENS.typography) {
  await figma.loadFontAsync({ family: 'Inter', style });
  const s = textStyles.find(x => x.name === name) || figma.createTextStyle();
  s.name = name; s.fontName = { family: 'Inter', style }; s.fontSize = fontSize; s.lineHeight = { unit: 'PERCENT', value: lh }; s.letterSpacing = { unit: 'PERCENT', value: ls }; s.description = desc;
}
summary.textStyles = TOKENS.typography.map(t => t[0]);

progress(0.9, 'Cienie');
const effects = await figma.getLocalEffectStylesAsync();
for (const [name, layers] of Object.entries(TOKENS.elevation)) { const s = effects.find(x => x.name === 'elevation/' + name) || figma.createEffectStyle(); s.name = 'elevation/' + name;
  s.effects = layers.map(([x, y, radius, a]) => ({ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a }, offset: { x, y }, radius, spread: 0, visible: true, blendMode: 'NORMAL' })); }
summary.effectStyles = Object.keys(TOKENS.elevation).map(n => 'elevation/' + n);

// kontrola: żadna zmienna bez zakresu (poza prymitywami) i bez składni kodu
const check = (await figma.variables.getLocalVariablesAsync());
summary.noScope = check.filter(v => !v.name.includes('/') ? false : v.variableCollectionId !== prim.id && v.scopes.includes('ALL_SCOPES')).map(v => v.name);
summary.noSyntax = check.filter(v => !v.codeSyntax || !v.codeSyntax.WEB).map(v => v.name);
summary.ids = { Primitives: prim.id, Size: size.id };
return summary;
