//# opis: sonda fill-i Icon tile, uzycia List row na 05, geometrii FAB na 15 i 07
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const nazwaZm = id => (byId[id] ? byId[id].name : id);
const fillInfo = n => {
  if (!('fills' in n) || !n.fills || n.fills === figma.mixed) return null;
  return n.fills.filter(f=>f.visible!==false).map(f => f.boundVariables && f.boundVariables.color ? 'VAR:' + nazwaZm(f.boundVariables.color.id) : (f.type==='SOLID'?'RGB:'+[f.color.r,f.color.g,f.color.b].map(x=>Math.round(x*255)).join(','):f.type));
};
const mc = async n => { try { return await n.getMainComponentAsync(); } catch (e) { return null; } };
const out = {};
const it = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Icon tile');
out.tileFills = [];
for (const c of it.children) {
  const ik = [];
  for (const k of c.children) {
    const m = k.type === 'INSTANCE' ? await mc(k) : null;
    ik.push({ n: k.name, t: k.type, fill: fillInfo(k), main: m ? m.name : null, vec: k.type==='INSTANCE' ? k.children.map(v=>({n:v.name,fill:fillInfo(v)})) : null, styl: k.type==='TEXT' ? k.textStyleId : null });
  }
  out.tileFills.push({ n: c.name, fill: fillInfo(c), radius: c.cornerRadius, layout: c.layoutMode,
    pad: [c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft],
    pa: c.primaryAxisAlignItems, ca: c.counterAxisAlignItems,
    boundR: c.boundVariables && c.boundVariables.topLeftRadius ? nazwaZm(c.boundVariables.topLeftRadius.id) : null,
    boundW: c.boundVariables && c.boundVariables.width ? nazwaZm(c.boundVariables.width.id) : null,
    sizH: c.layoutSizingHorizontal, sizV: c.layoutSizingVertical, ikona: ik });
}
out.setLayout = { layoutMode: it.layoutMode, pad: [it.paddingTop,it.paddingRight,it.paddingBottom,it.paddingLeft], spacing: it.itemSpacing, fill: fillInfo(it), w: it.width, h: it.height };
const sek = page.children.find(c => c.type==='SECTION' && c.name==='Jasny motyw');
const f05 = sek.children.find(c => c.name === '05 Zadania · zrobione i archiwum');
const rows = [];
for (const r of f05.findAll(n => n.type === 'INSTANCE')) {
  const m = await mc(r);
  if (m && m.parent && m.parent.name === 'List row') rows.push({ r, m });
}
out.uzycie05 = [];
for (const { r, m } of rows.slice(0, 3)) {
  const zag = [];
  for (const n of r.findAll(x => x.type === 'INSTANCE')) zag.push(n.name + ' {' + Object.entries(n.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+JSON.stringify(v.value)).join(', ') + '}');
  out.uzycie05.push({ wariant: m.name, props: Object.entries(r.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+JSON.stringify(v.value)), zagniezdzone: zag });
}
const drz = async (n,d)=>{const L=[];const r=async(x,l)=>{if(l>d)return;let mm='';if(x.type==='INSTANCE'){const m=await mc(x);if(m)mm='<'+(m.parent&&m.parent.type==='COMPONENT_SET'?m.parent.name+'/':'')+m.name+'>';}L.push('  '.repeat(l)+`${x.name} [${x.type}]${mm} ${Math.round(x.x)},${Math.round(x.y)} ${Math.round(x.width)}x${Math.round(x.height)}${x.type==='TEXT'?' "'+(x.characters||'').slice(0,60)+'"':''}`);if('children' in x)for(const c of x.children)await r(c,l+1);};await r(n,0);return L;};
out.drzewo05 = await drz(f05, 3);
for (const nz of ['15 Plan · dzień','07 Wiadomości · odebrane']) {
  const f = sek.children.find(c => c.name === nz);
  let fab=null, tb=null;
  for (const n of f.findAll(x => x.type==='INSTANCE')) { const m = await mc(n); if (m && m.name==='FAB') fab=n; if (m && m.parent && m.parent.name==='Tab bar') tb=n; }
  if (fab && tb) {
    const ab = fab.absoluteBoundingBox, bb = tb.absoluteBoundingBox, fb = f.absoluteBoundingBox;
    out['fab_'+nz.split(' ')[0]] = { odstepDoTabBar: Math.round(bb.y-(ab.y+ab.height)), fabPrawa: Math.round(fb.x+fb.width-(ab.x+ab.width)), fabWH: [Math.round(fab.width),Math.round(fab.height)], ramkaH: Math.round(f.height), rodzicFab: fab.parent.name, fabXY: [Math.round(fab.x),Math.round(fab.y)] };
  }
}
return out;
