//# opis: odbudowa formularza nowej wiadomosci
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const setTF = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Text field');
const setBtn = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
const W = {}; for (const c of setTF.children) W[c.name] = c;
const B = {}; for (const c of setBtn.children) B[c.name] = c;
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (n, k) => wszystkie.find(v => v.name === n && v.variableCollectionId === k.id);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const POLA = [
  { label: 'Do', value: 'Wybierz odbiorcę', typ: 'Single', blad: 'Wskaż, do kogo wysyłasz wiadomość.' },
  { label: 'Temat', value: 'Wpisz temat', typ: 'Single', blad: 'Temat nie może być pusty.' },
  { label: 'Treść', value: 'Napisz wiadomość…', typ: 'Multiline', blad: 'Wpisz treść wiadomości.' }
];
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  for (const nazwa of ['13 Nowa wiadomość', '14 Nowa wiadomość · błędy walidacji']) {
    const f = sek.children.find(x => x.name === nazwa);
    if (!f) continue;
    const main = f.children.find(c => c.name === 'Main Content');
    if (main.children.length > 1) { log.push({ screen: nazwa, stan: 'ma już treść' }); continue; }
    const bledy = /błędy/.test(nazwa);
    const compose = figma.createFrame();
    compose.name = 'Compose';
    compose.layoutMode = 'VERTICAL';
    compose.itemSpacing = 16;
    compose.fills = [];
    main.appendChild(compose);
    compose.layoutSizingHorizontal = 'FILL';
    for (const pole of POLA) {
      const wariant = W['Type=' + pole.typ + ', State=' + (bledy ? 'Error' : 'Empty')];
      const inst = wariant.createInstance();
      compose.appendChild(inst);
      inst.layoutSizingHorizontal = 'FILL';
      const p = inst.componentProperties || {};
      const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
      const set = {};
      if (k('Label')) set[k('Label')] = pole.label;
      if (k('Show label')) set[k('Show label')] = true;
      if (k('Value')) set[k('Value')] = pole.value;
      if (k('Error text')) set[k('Error text')] = pole.blad;
      inst.setProperties(set);
    }
    // rzad akcji: pomocnicza po lewej, glowna po prawej, 50/50
    const rzad = figma.createFrame();
    rzad.name = 'Container';
    rzad.layoutMode = 'HORIZONTAL';
    rzad.itemSpacing = 8;
    rzad.paddingTop = 8;
    rzad.counterAxisAlignItems = 'CENTER';
    rzad.fills = [];
    compose.appendChild(rzad);
    rzad.layoutSizingHorizontal = 'FILL';
    for (const [wariant, etykieta] of [['Style=Secondary, State=Default', 'Anuluj'], ['Style=Primary, State=Default', 'Wyślij']]) {
      const b = B[wariant].createInstance();
      rzad.appendChild(b);
      b.layoutSizingHorizontal = 'FILL';
      b.layoutGrow = 1;
      b.layoutSizingVertical = 'FIXED';
      b.resize(b.width, 48);
      const p = b.componentProperties || {};
      const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
      const kI = Object.keys(p).find(x => x.split('#')[0] === 'Show icon');
      const set = {};
      if (kL) set[kL] = etykieta;
      if (kI) set[kI] = etykieta === 'Wyślij';
      b.setProperties(set);
    }
    rzad.layoutSizingVertical = 'HUG';
    // stopka
    const stopka = figma.createText();
    stopka.characters = 'Szkic zostaje, dopóki nie wyślesz wiadomości.';
    stopka.name = 'Szkic';
    if (S['body/sm']) await stopka.setTextStyleIdAsync(S['body/sm'].id);
    stopka.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.37, g: 0.39, b: 0.41 } }, 'color', zm('color/on-surface-variant', kolekcja))];
    stopka.textAutoResize = 'HEIGHT';
    compose.appendChild(stopka);
    stopka.layoutSizingHorizontal = 'FILL';
    compose.layoutSizingVertical = 'HUG';
    log.push({ sekcja: sek.name, screen: nazwa, odbudowane: compose.children.length });
    await shot(f, { scale: 0.7, name: 'vF1-' + (sek.name === 'Ciemny motyw' ? 'd' : 'l') + '-' + nazwa.split(' ')[0] });
  }
}
return log;
