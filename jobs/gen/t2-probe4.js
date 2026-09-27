//# opis: sonda Banner, Tab bar, stylow tekstu, promieni kart
const ds = figma.root.children.find(p => p.name === 'Design System');
await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await page.loadAsync();
const sek = page.children.find(c => c.type==='SECTION' && c.name==='Jasny motyw');
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => byId[v.id] = v);
const mc = async n => { try { return await n.getMainComponentAsync(); } catch (e) { return null; } };
const fillInfo = n => { if (!('fills' in n) || !n.fills || n.fills === figma.mixed) return ''; const a = n.fills.filter(f=>f.visible!==false).map(f => f.boundVariables && f.boundVariables.color ? '$'+byId[f.boundVariables.color.id].name.replace('color/','') : 'rgb'); return a.length?' fill='+a.join('/'):''; };
const out = {};
const styles = await figma.getLocalTextStylesAsync();
out.style = styles.map(s => ({ n: s.name, size: s.fontSize, f: s.fontName.family+'/'+s.fontName.style, lh: JSON.stringify(s.lineHeight), ls: JSON.stringify(s.letterSpacing) }));
const drz = async (n,d)=>{const L=[];const r=async(x,l)=>{if(l>d)return;let mm='';if(x.type==='INSTANCE'){const m=await mc(x);if(m)mm='<'+(m.parent&&m.parent.type==='COMPONENT_SET'?m.parent.name+'/':'')+m.name+'>';}
 const pr = x.componentPropertyReferences ? ' REF'+JSON.stringify(Object.entries(x.componentPropertyReferences).map(([k,v])=>k+'='+String(v).split('#')[0])) : '';
 const st = x.type==='TEXT' ? ' styl='+(x.textStyleId?(styles.find(s=>s.id===x.textStyleId)||{}).name:'BRAK') : '';
 const cr = ('cornerRadius' in x) ? ' r='+String(x.cornerRadius) : '';
 L.push('  '.repeat(l)+`${x.name} [${x.type}]${mm} ${Math.round(x.width)}x${Math.round(x.height)}${x.type==='TEXT'?' "'+(x.characters||'').slice(0,40)+'"':''}${st}${cr}${fillInfo(x)}${pr}`);
 if('children' in x)for(const c of x.children)await r(c,l+1);};await r(n,0);return L;};
const banner = ds.findOne(n => n.type==='COMPONENT_SET' && n.name==='Banner');
out.banner = await drz(banner, 5);
out.bannerProps = banner.componentPropertyDefinitions;
const tabbar = ds.findOne(n => n.type==='COMPONENT_SET' && n.name==='Tab bar');
out.tabbar = await drz(tabbar.children[0], 5);
// instancja Banner na 20
const f20 = sek.children.find(c=>c.name==='20 Stan · błąd odświeżania');
let b20 = null; for (const n of f20.findAll(x=>x.type==='INSTANCE')) { const m = await mc(n); if (m && m.parent && m.parent.name==='Banner') { b20 = n; break; } }
out.banner20 = b20 ? await drz(b20, 4) : null;
out.banner20props = b20 ? Object.entries(b20.componentProperties||{}).map(([k,v])=>k.split('#')[0]+'='+JSON.stringify(v.value)) : null;
// Tab bar na 01 - plakietki
const f01 = sek.children.find(c=>c.name==='01 Teraz');
let tb=null; for (const n of f01.findAll(x=>x.type==='INSTANCE')) { const m = await mc(n); if (m && m.parent && m.parent.name==='Tab bar') { tb=n; break; } }
out.tabbar01 = tb ? await drz(tb, 4) : null;
// List frame z 05 - promien, clip
const f05 = sek.children.find(c=>c.name==='05 Zadania · zrobione i archiwum');
const lista = f05.findOne(n=>n.name==='List' && n.type==='FRAME');
out.lista05 = { r: lista.cornerRadius, boundR: lista.boundVariables && lista.boundVariables.topLeftRadius ? byId[lista.boundVariables.topLeftRadius.id].name : null, clip: lista.clipsContent, fill: fillInfo(lista), efekty: lista.effects.length, strokes: lista.strokes.length };
// stopka 02f styl
const stopka = f05.parent.children.find(c=>c.name==='02f Teraz · frekwencja').findOne(n=>n.type==='TEXT' && /Kolor pierścienia/.test(n.characters||''));
out.stopka02f = { styl: (styles.find(s=>s.id===stopka.textStyleId)||{}).name, fill: fillInfo(stopka) };
const par05 = f05.findOne(n=>n.type==='TEXT' && /zadania do zrobienia/.test(n.characters||''));
out.paragraf05 = { styl: (styles.find(s=>s.id===par05.textStyleId)||{}).name };
return out;
