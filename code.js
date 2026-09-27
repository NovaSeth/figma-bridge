// Claude Bridge: wykonuje skrypty Plugin API przysłane z lokalnego serwera (tylko localhost) i odsyła wynik.
// Okno wtyczki musi zostać otwarte. Zamknięcie okna kończy most.
figma.showUI(__html__, { width: 280, height: 86, title: 'Claude Bridge', themeColors: true });

// Tożsamość pliku dla serwera (komentarze czyta serwer przez REST, bo Plugin API ich nie udostępnia).
const context = () => ({ type: 'context', fileKey: figma.fileKey || null, fileName: figma.root.name });
figma.ui.postMessage(context());

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const compile = code => {
  try { return new AsyncFunction('figma', 'shot', 'progress', code); }
  catch (e) { return eval('(async function (figma, shot, progress) {\n' + code + '\n})'); }
};

figma.ui.onmessage = async msg => {
  if (msg && msg.type === 'resize') return figma.ui.resize(280, Math.max(56, Math.min(460, Math.round(msg.height))));
  if (msg && msg.type === 'ready') return figma.ui.postMessage(context());
  if (!msg || msg.type !== 'job') return;
  const images = [];
  // shot(node, {scale, name}): dołącza PNG węzła do wyniku.
  const shot = async (node, opts) => {
    const o = opts || {};
    const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: o.scale || 1 } });
    images.push({ name: o.name || node.id.replace(/[:;]/g, '-'), bytes });
  };
  // Skrypt, który padnie w połowie, zostawia na stronie węzły jeszcze niewstawione
  // do żadnej ramki. Zapamiętuję stan sprzed startu i po błędzie je sprzątam.
  const przed = new Set(figma.currentPage.children.map(n => n.id));
  const stronaPrzed = figma.currentPage;
  try {
    // progress(0..1, opis): postęp kroku widoczny w oknie wtyczki
    const progress = (value, note) => figma.ui.postMessage({ type: 'progress', value, note: note || '' });
    const result = await compile(msg.code)(figma, shot, progress);
    figma.ui.postMessage({ type: 'result', id: msg.id, ok: true, result: result === undefined ? null : result, images });
  } catch (e) {
    let sprzatniete = 0;
    try {
      for (const n of (figma.currentPage === stronaPrzed ? figma.currentPage : stronaPrzed).children.slice()) {
        if (!przed.has(n.id) && n.type !== 'SECTION') { n.remove(); sprzatniete++; }
      }
    } catch (err) {}
    const opis = String(e && e.message ? e.message : e) + (sprzatniete ? ' (posprzątano ' + sprzatniete + ' niedokończonych węzłów)' : '');
    figma.ui.postMessage({ type: 'result', id: msg.id, ok: false, error: opis, images });
  }
};
