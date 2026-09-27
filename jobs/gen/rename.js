//# Zmiana nazwy strony makiet
const page = figma.root.children.find(p => p.name === '[Mobile] User Front' || p.name === '[Mobile] User Front');
const before = page.name; page.name = '[Mobile] User Front';
return { before, after: page.name, pages: figma.root.children.map(p => p.name) };
