//# DS P3: naprawa rzędu akcji w Action card
const card = findComp('Action card');
for (const v of card.children) {
  const act = v.findOne(n => n.name === 'Actions'); [...act.children].forEach(c => c.remove());
  act.layoutMode = 'VERTICAL'; act.layoutWrap = 'NO_WRAP'; act.setBoundVariable('itemSpacing', V('spacing/sm')); act.primaryAxisSizingMode = 'AUTO'; act.layoutSizingHorizontal = 'FILL';
  const msg = v.name.includes('Message');
  const r1 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r1); r1.layoutSizingHorizontal = 'FILL';
  const p = inst('Button', 'Style=Primary'); setProp(p, 'Label', msg ? 'Ogarnięte' : 'Zrobione'); r1.appendChild(p); p.layoutGrow = 1;
  const d = inst('Button', 'Style=Secondary'); setProp(d, 'Label', 'Szczegóły'); r1.appendChild(d);
  if (msg) { const r2 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r2); const r = inst('Button', 'Style=Secondary'); setProp(r, 'Label', 'Odpowiedz'); setProp(r, 'Ikona', true); r2.appendChild(r); }
}
await shot(card, { name: 'ds-card', scale: 1 });
return { ok: true };
