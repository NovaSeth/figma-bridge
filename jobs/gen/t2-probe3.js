//# opis: glebokie drzewa ekranow zrodlowych
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const sek = page.children.find(c => c.type==='SECTION' && c.name==='Jasny motyw');
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const fillInfo = n => { if (!('fills' in n) || !n.fills || n.fills === figma.mixed) return ''; const a = n.fills.filter(f=>f.visible!==false).map(f => f.boundVariables && f.boundVariables.color ? '$'+byId[f.boundVariables.color.id].name.replace('color/','') : 'rgb'); return a.length?' fill='+a.join('/'):''; };
const mc = async n => { try { return await n.getMainComponentAsync(); } catch (e) { return null; } };
const drz = async (n,d)=>{const L=[];const r=async(x,l)=>{if(l>d)return;let mm='';if(x.type==='INSTANCE'){const m=await mc(x);if(m)mm='<'+(m.parent&&m.parent.type==='COMPONENT_SET'?m.parent.name+'/':'')+m.name+'>';}
 const la = x.layoutMode && x.layoutMode!=='NONE' ? ' AL='+x.layoutMode[0]+' gap'+x.itemSpacing+' pad'+[x.paddingTop,x.paddingRight,x.paddingBottom,x.paddingLeft].join('/')+' sz'+x.layoutSizingHorizontal+'/'+x.layoutSizingVertical : '';
 const pr = x.type==='INSTANCE' ? ' {'+Object.entries(x.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+(typeof v.value==='string'?'"'+v.value.slice(0,40)+'"':v.value)).join(', ')+'}' : '';
 L.push('  '.repeat(l)+`${x.name} [${x.type}]${mm} ${Math.round(x.x)},${Math.round(x.y)} ${Math.round(x.width)}x${Math.round(x.height)}${x.type==='TEXT'?' "'+(x.characters||'').slice(0,80)+'"':''}${la}${fillInfo(x)}${pr}`);
 if('children' in x && x.type!=='INSTANCE')for(const c of x.children)await r(c,l+1);};await r(n,0);return L;};
const out = {};
for (const nz of ['05 Zadania · zrobione i archiwum','06 Oceny','20 Stan · błąd odświeżania','15 Plan · dzień','02f Teraz · frekwencja','02b Teraz · odpowiedź','08 Wiadomość · wątek','01 Teraz']) {
  const f = sek.children.find(c => c.name === nz);
  out[nz] = f ? await drz(f, 6) : ['BRAK'];
}
return out;
