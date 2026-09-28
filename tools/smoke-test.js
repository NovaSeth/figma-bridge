//# Smoke test (dry run)
// Safe live check of the bridge on whatever file the plugin is open in:
//   node run.mjs tools/smoke-test.js --dry-run  (or figma_run with file and dryRun:true)
// Uses every built-in prelude helper, builds a small throwaway card, and makes a few writes to the file that
// the dry run records instead of applying. Result: checks that passed, and a dry-run report with entries.
// Without --dry-run it stops before changing anything.
// A job is the body of an async function and returns its result. The body is wrapped in an async arrow so
// the file is also a valid CommonJS script (tools/package.json), which `node --check` can verify.

return (async () => {
  // Tell the modes apart: in a dry run a write to an existing node is recorded, not applied, so it does not
  // read back. Outside one this sets and clears a plugin-data key on the document, nothing a user can see.
  const probe = 'probe-' + Math.random();
  figma.root.setPluginData('bridge-smoke-test', probe);
  if (figma.root.getPluginData('bridge-smoke-test') === probe) {
    figma.root.setPluginData('bridge-smoke-test', '');
    throw new Error('not a dry run, nothing changed. Run: node run.mjs tools/smoke-test.js --dry-run');
  }

  const checks = [];
  const check = (name, ok) => checks.push((ok ? 'ok   ' : 'FAIL ') + name);

  const page = await usePage(figma.currentPage.name);
  check('usePage returns the current page', page === figma.currentPage);
  check('hex and solid agree', solid('#FF8000', 0.5)[0].color.g === hex('#FF8000').g && solid('#FF8000', 0.5)[0].opacity === 0.5);
  const everything = all(page);
  check('all() includes the root', everything[0] === page);
  const words = texts(page);
  let fonts = [];
  try {
    fonts = await loadFonts(words.slice(0, 200));
    check('loadFonts covers every text it was given', words.slice(0, 200).every(t => t.fontName === figma.mixed || fonts.some(f => f.family === t.fontName.family && f.style === t.fontName.style)));
  } catch (e) { checks.push('skip loadFonts, a font of this page is missing here: ' + e.message); }

  // A throwaway card: created nodes are real during a dry run and removed when it ends.
  const card = frame('Bridge smoke test', 'VERTICAL', { itemSpacing: 8, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 });
  card.fills = solid('#FFFFFF');
  const label = await text('Claude Bridge smoke test', { style: 'Regular', size: 14, fill: '#111113' });
  label.name = 'Label';
  card.appendChild(label);
  check('byName and one find by string, RegExp and predicate', one('Label', card) === label && byName(/^Lab/, card).length === 1 && one(n => n.type === 'TEXT', card) === label);
  check('inspect outlines a node and its children', (await inspect(card, { depth: 1 })).split('\n')[1].indexOf('TEXT "Label" ' + label.id) === 2);
  check('find finds text content on the page', (await find('claude bridge smoke', { type: 'TEXT', page: page.name })).indexOf(label.id + ' TEXT "Label"') >= 0);
  check('library lists variables, styles and components as text', typeof (await library('variables')) === 'string' && typeof (await library('styles')) === 'string');

  let variableName = null;
  const [colour] = await figma.variables.getLocalVariablesAsync('COLOR');
  if (colour) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(colour.variableCollectionId);
    const found = await variable(colour.name, collection.name);
    check('variable finds a colour variable by name and collection', found === colour);
    const swatch = frame('Swatch', 'HORIZONTAL', { fills: await paintVar(found) });
    card.appendChild(swatch);
    check('paintVar binds the fill', swatch.fills[0].boundVariables.color.id === colour.id);
    variableName = colour.name;
  } else checks.push('skip variable/paintVar: no local colour variables');

  let componentName = null;
  await figma.loadAllPagesAsync();
  const first = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }).find(c => c.parent.type !== 'COMPONENT_SET');
  if (first) {
    try {
      // component() takes the first match by name and a file may reuse names, so the rest works on what it found.
      const found = await component(first.name);
      check('component finds a local component by name', found !== null && found.name === first.name);
      const inst = await instance(found.name, found.type === 'COMPONENT_SET' ? found.children[found.children.length - 1].name : undefined);
      card.appendChild(inst);
      await loadFonts(inst); // a TEXT property writes into the instance's text, which needs its font
      const short = k => (k.lastIndexOf('#') > 0 ? k.slice(0, k.lastIndexOf('#')) : k);
      const props = Object.entries(inst.componentProperties);
      const [key, prop] = props.find(([k, p]) => (p.type === 'TEXT' || p.type === 'BOOLEAN') && props.filter(([o]) => short(o) === short(k)).length === 1) || [];
      if (key) {
        const value = prop.type === 'TEXT' ? 'Smoke test' : !prop.value;
        setProp(inst, short(key), value);
        check('setProp sets a property by its short name', inst.componentProperties[key].value === value);
      }
    } catch (e) { checks.push('FAIL component/instance/setProp: ' + e.message); }
    componentName = first.name;
  } else checks.push('skip component/instance/setProp: no local components');

  // cloneVariant on a set of our own, so no component of the file gets a variant, not even for a moment.
  const variantA = figma.createComponent();
  variantA.name = 'State=A';
  const variantLabel = await text('A');
  variantLabel.name = 'Label';
  variantA.appendChild(variantLabel);
  const variantB = figma.createComponent();
  variantB.name = 'State=B';
  const set = figma.combineAsVariants([variantA, variantB], card);
  const labelKey = set.addComponentProperty('Label', 'TEXT', 'A');
  variantLabel.componentPropertyReferences = { characters: labelKey };
  const variantC = cloneVariant(set, variantA, 'State=C');
  check('cloneVariant keeps the property references', variantC.parent === set && variantC.children[0].componentPropertyReferences.characters === labelKey);

  // Writes the dry run records instead of applying.
  page.appendChild(card);
  await shot(card, { name: 'smoke-test' });
  page.name = page.name + ' (smoke test)';
  const victim = page.children.find(n => n !== card);
  if (victim) {
    victim.name = victim.name + ' (smoke test)';
    if ('opacity' in victim) victim.opacity = 0.5;
    victim.remove();
  }
  check('recorded writes read back unchanged', page.name === figma.currentPage.name && !page.name.endsWith('(smoke test)') && (!victim || !victim.removed));

  return { page: page.name, nodes: everything.length - 1, texts: words.length, fonts: fonts.length, variable: variableName, component: componentName, checks };
})();
