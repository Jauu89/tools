// ===== Mi cartera: posiciones, beneficios/pérdidas y X-Ray de Morningstar =====
let PF={lots:[],px:{},xray:null},pfOpen=true;
try{const s=JSON.parse(LS.get('pf_v1')||'null');if(s)PF={lots:s.lots||[],px:s.px||{},xray:s.xray||null};}catch(e){}
const pfSave=()=>LS.set('pf_v1',JSON.stringify(PF));
const nfmt=(v,d=2)=>v.toLocaleString('es-ES',{maximumFractionDigits:d,minimumFractionDigits:d});
const money=(v,c)=>{try{return v.toLocaleString('es-ES',{style:'currency',currency:c||'EUR'});}catch(e){return nfmt(v)+' '+(c||'');}};
const signMoney=(v,c)=>(v>0?'+':v<0?'−':'')+money(Math.abs(v),c);
const signPct=v=>(v>0?'+':v<0?'−':'')+nfmt(Math.abs(v)*100)+' %';
const plCls=v=>v>0?'good':v<0?'bad':'';

// Calcula posiciones con coste medio ponderado; las ventas reducen coste proporcionalmente y generan beneficio realizado.
function pfPositions(){const m={};
 for(const l of PF.lots){const p=m[l.key]||(m[l.key]={key:l.key,name:l.name,type:l.type,cur:l.cur||'EUR',units:0,cost:0,realized:0});
  if(l.name)p.name=l.name;
  if(l.side==='sell'){const avg=p.units?p.cost/p.units:0,u=Math.min(l.units,p.units);
   p.realized+=u*(l.price-avg)-(l.fees||0);p.cost-=avg*u;p.units-=u;}
  else{p.units+=l.units;p.cost+=l.units*l.price+(l.fees||0);}}
 return Object.values(m).map(p=>{const q=PF.px[p.key];
  p.avg=p.units>1e-9?p.cost/p.units:0;p.last=q?q.p:null;p.ts=q?q.ts:null;p.src=q?q.src:null;
  p.value=p.last!=null?p.units*p.last:null;p.pl=p.value!=null?p.value-p.cost:null;
  p.plPct=(p.pl!=null&&p.cost>0)?p.pl/p.cost:null;return p;});}

function pfPrefill(o){ // desde la pestaña Fondos
 document.querySelector('nav button[data-t=pf]').click();
 const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v;};
 set('pf_type',o.type||'fondo');set('pf_name',o.name);set('pf_key',o.key);set('pf_cur',o.cur||'EUR');set('pf_cur_px',o.price);
 pfOpen=true;document.getElementById('pf_form').open=true;document.getElementById('pf_units').focus();}

function pfAdd(){
 const g=id=>document.getElementById(id).value.trim(),n=id=>parseFloat(g(id).replace(',','.'));
 const key=g('pf_key').toUpperCase(),units=n('pf_units'),price=n('pf_price'),fees=n('pf_fees')||0,side=g('pf_side');
 const msg=document.getElementById('pf_msg');
 if(!key||!(units>0)||!(price>=0)){msg.textContent='Rellena ISIN/ticker, participaciones y precio de la operación.';msg.className='bad';return;}
 PF.lots.push({id:Date.now()+Math.random(),key,name:g('pf_name')||key,type:g('pf_type'),side,units,price,fees,date:g('pf_date'),cur:(g('pf_cur')||'EUR').toUpperCase()});
 const cp=n('pf_cur_px');if(cp>0)PF.px[key]={p:cp,ts:Date.now(),src:'manual'};
 pfSave();['pf_units','pf_price','pf_fees','pf_cur_px'].forEach(i=>document.getElementById(i).value='');
 pfRender();document.getElementById('pf_side').value='buy';const m2=document.getElementById('pf_msg');m2.textContent='✔ Operación añadida. Puedes añadir otra.';m2.className='good';}
function pfDelLot(id){PF.lots=PF.lots.filter(l=>l.id!==id);pfSave();pfRender();}
function pfSetPx(el){const v=parseFloat(el.value.replace(',','.'));if(v>0)PF.px[el.dataset.k]={p:v,ts:Date.now(),src:'manual'};else delete PF.px[el.dataset.k];pfSave();pfRender();}
function pfClear(){if(confirm('¿Borrar toda tu cartera de este dispositivo?')){PF={lots:[],px:{},xray:null};pfSave();pfRender();}}

async function pfRefresh(){
 const st=document.getElementById('pf_upd'),key=fhKey();let ok=0;const miss=[];st.textContent='Actualizando…';
 for(const p of pfPositions()){if(p.type==='fondo'){miss.push(p.name+' (fondo: sube su ficha Morningstar o edita el precio)');continue;}
  try{let price=null,src='';
   if(key){const q=await fh('/quote?symbol='+encodeURIComponent(p.key),key);price=q.c||null;src='Finnhub';}
   if(price==null&&location.protocol!=='file:'){const r=await fetch('/api/quote?tickers='+encodeURIComponent(p.key));if(r.ok){const j=await r.json();price=(j.prices||{})[p.key]??null;src='Yahoo';}}
   if(price){PF.px[p.key]={p:price,ts:Date.now(),src};ok++;}else miss.push(p.key);}catch(e){miss.push(p.key+' ('+e.message+')');}}
 pfSave();pfRender();
 document.getElementById('pf_upd').innerHTML=`${ok} precio(s) actualizado(s).`+(miss.length?` <span class="mu">Sin actualizar: ${miss.map(esc).join('; ')}</span>`:'');}

async function pfPdfNav(files){const st=document.getElementById('pf_upd');
 for(const f of files){try{const o=parseMorningstar(await pdfText(f));
  if(!o.nav||!o.isin){st.textContent=f.name+': no encuentro ISIN o valor liquidativo.';continue;}
  const pos=pfPositions().find(p=>p.key===o.isin);
  if(pos){PF.px[o.isin]={p:o.nav,ts:Date.now(),src:'Morningstar '+(o.nav_date||'')};pfSave();pfRender();st.innerHTML=`VL de <b>${esc(o.name||o.isin)}</b> actualizado: ${nfmt(o.nav)} ${esc(o.cur||'')} (${esc(o.nav_date||'')}).`;}
  else{st.innerHTML=`Este fondo (<b>${esc(o.name||o.isin)}</b>) aún no está en tu cartera. Rellenado el formulario: añade tus participaciones y precio de compra.`;pfPrefill({type:'fondo',name:o.name,key:o.isin,price:o.nav,cur:o.cur});}
 }catch(e){st.textContent='Error: '+e.message;}}}

// ---- X-Ray de cartera (PDF "X-Ray de Cartera" de Morningstar) ----
function parseXRay(text){
 const t=text.replace(/\s+/g,' '),o={},first=re=>{const m=t.match(re);return m?_n(m[1]):null;};
 const m0=t.match(/Informe a (\d{1,2} \S+ \d{4})/);if(m0)o.date=m0[1];
 o.assets={};for(const [k,l] of [['acciones','Acciones'],['bonos','Obligaciones'],['efectivo','Efectivo'],['otro','Otro']])o.assets[k]=first(new RegExp('\\b'+l+' (\\d+[.,]\\d+) \\d+[.,]\\d+'));
 o.regions={america:first(/Am[eé]rica (\d+[.,]\d+)/),europa:first(/Europa (\d+[.,]\d+)/),asia:first(/Asia (\d+[.,]\d+)/)};
 o.usa=first(/Estados Unidos (\d+[.,]\d+)/);
 o.sectors={};for(const [k,l] of [['Tecnología','Tecnolog[ií]a'],['Servicios financieros','Servicios Financieros'],['Consumo cíclico','Consumo C[ií]clico'],['Comunicación','Servicios de Comunicaci[oó]n'],['Industria','Industria'],['Salud','Salud'],['Consumo defensivo','Consumo Defensivo'],['Energía','Energ[ií]a'],['Inmobiliario','Inmobiliario'],['Servicios públicos','Servicios P[uú]blicos'],['Materiales','Materiales B[aá]sicos']]){
  const v=first(new RegExp(l+' (\\d+[.,]\\d+)'));if(v!=null)o.sectors[k]=v;}
 o.pe=first(/Precio\/Beneficio (\d+[.,]\d+)/);o.pb=first(/Precio\/Valor Contable (\d+[.,]\d+)/);
 const i=t.search(/principales posiciones/i);o.top=[];
 if(i>=0){const seg=t.slice(i).split('©')[0];const re=/(\d{1,2}[.,]\d{2}) (.+?) (?:Acci[oó]n|Obligaci[oó]n|Efectivo|Fondo|Otro) /g;let m;
  while((m=re.exec(seg))&&o.top.length<10)o.top.push({pct:_n(m[1]),name:m[2].trim()});}
 o.top10=o.top.reduce((a,x)=>a+x.pct,0);return o;}

async function pfXray(files){const st=document.getElementById('pf_upd');
 try{const x=parseXRay(await pdfText(files[0]));if(x.assets.acciones==null&&!x.top.length){st.textContent='No parece un X-Ray de cartera de Morningstar.';return;}
  PF.xray=x;pfSave();pfRender();st.textContent='X-Ray cargado ('+(x.date||'')+').';}catch(e){st.textContent='Error: '+e.message;}}

function xrayInsights(x){const L=[];const a=x.assets;
 if(a.acciones>=90)L.push(['mid','Cartera 100 % renta variable','Máximo potencial a largo plazo, pero caídas del 30-50 % son normales (2022: −13 % en este tipo de fondo). Asegúrate de que tu horizonte es largo y de que no necesitarás ese dinero pronto. Los bonos o el efectivo amortiguan las caídas.']);
 if(x.usa>=70)L.push(['mid',`Concentración geográfica: ${nfmt(x.usa)} % en EE. UU.`,'Dependes de una sola economía y de una sola divisa (el dólar). Los fondos globales o de mercados desarrollados reparten ese riesgo entre más países.']);
 const tech=x.sectors['Tecnología'];if(tech>=30)L.push(['mid',`Sector tecnología: ${nfmt(tech)} %`,'Un tercio o más en un solo sector aumenta el riesgo: si la tecnología corrige, tu cartera lo nota mucho más que el mercado en conjunto.']);
 if(x.top10>=30)L.push(['mid',`Las 10 mayores posiciones suman ${nfmt(x.top10)} %`,'En índices ponderados por capitalización pocas empresas gigantes pesan mucho. No es un error, pero conviene saberlo.']);
 if(x.pe>=18)L.push(['mid',`PER de la cartera: ${nfmt(x.pe,1)}`,'Valoración por encima de la media histórica del mercado amplio (~15-16). No predice el corto plazo, pero reduce el margen de seguridad.']);
 if(!L.length)L.push(['good','Sin concentraciones destacadas','Composición equilibrada según los umbrales de la app.']);return L;}
function xrayHtml(x){
 const bar=(l,v)=>`<div class="row"><div style="min-width:150px">${esc(l)}</div><div class="bar"><i style="width:${Math.min(100,v||0)}%"></i></div><b>${nfmt(v||0)} %</b></div>`;
 return `<div class="card"><b>🔍 X-Ray de tu cartera</b> <span class="mu">(${esc(x.date||'')})</span>
 <h2>Reparto de activos</h2>${bar('Acciones',x.assets.acciones)}${bar('Bonos',x.assets.bonos)}${bar('Efectivo',x.assets.efectivo)}
 <h2>Regiones</h2>${bar('América',x.regions.america)}${bar('Europa',x.regions.europa)}${bar('Asia',x.regions.asia)}
 <h2>Sectores</h2>${Object.entries(x.sectors).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>bar(k,v)).join('')}
 <h2>Mayores posiciones subyacentes</h2><div class="mu">${x.top.map(t=>esc(t.name)+' '+nfmt(t.pct)+' %').join(' · ')}</div>
 <h2>Lo que te dice</h2>${xrayInsights(x).map(([c,h,t])=>`<div class="f"><b class="${c}">${esc(h)}</b><div>${esc(t)}</div></div>`).join('')}</div>`;}

// ---- Render ----
const PF_KEEP=['pf_side','pf_type','pf_name','pf_key','pf_cur','pf_date'];
function pfRender(){
 const root=document.getElementById('pf');if(!root)return;
 const keep={};PF_KEEP.forEach(i=>{const e=document.getElementById(i);if(e)keep[i]=e.value;}); // conserva el formulario entre operaciones
 const pos=pfPositions().filter(p=>p.units>1e-9||p.realized);
 const open=pos.filter(p=>p.units>1e-9);
 const tot={};for(const p of open){const t=tot[p.cur]||(tot[p.cur]={value:0,cost:0,costAll:0,realized:0,nopx:0});
  t.costAll+=p.cost;if(p.value!=null){t.value+=p.value;t.cost+=p.cost;}else t.nopx++;}
 for(const p of pos){const t=tot[p.cur]||(tot[p.cur]={value:0,cost:0,costAll:0,realized:0,nopx:0});t.realized+=p.realized;}
 const tiles=Object.entries(tot).map(([c,t])=>{const pl=t.value-t.cost,pct=t.cost>0?pl/t.cost:0;
  return `<div class="card"><div class="mu">Resumen en ${esc(c)}</div>
  <div class="row" style="gap:24px"><div><div class="mu">Valor actual</div><div style="font-size:22px;font-weight:700">${money(t.value,c)}</div></div>
  <div><div class="mu">Invertido</div><div style="font-size:22px;font-weight:700">${money(t.cost,c)}</div></div>
  <div><div class="mu">Beneficio / pérdida</div><div class="${plCls(pl)}" style="font-size:22px;font-weight:700">${(pl>0?'▲ ':pl<0?'▼ ':'')}${signMoney(pl,c)} <span style="font-size:15px">(${signPct(pct)})</span></div></div></div>
  ${t.realized?`<div class="mu">Beneficio realizado por ventas: <b class="${plCls(t.realized)}">${signMoney(t.realized,c)}</b></div>`:''}
  ${t.nopx?`<div class="mu">⚠️ ${t.nopx} posición(es) sin precio actual: no cuentan en el resumen. Escribe su precio en la tabla.</div>`:''}</div>`;}).join('');
 const totalVal=Object.values(tot).reduce((a,t)=>a+t.value,0)||1;
 const rows=open.sort((a,b)=>(b.value||0)-(a.value||0)).map(p=>`<tr>
  <td><b>${esc(p.name)}</b><div class="mu">${esc(p.key)} · ${esc(p.type)}</div></td>
  <td class="${plCls(p.pl)}">${p.pl!=null?(p.pl>0?'▲ ':p.pl<0?'▼ ':'')+signMoney(p.pl,p.cur):'–'}</td>
  <td class="${plCls(p.pl)}"><b>${p.plPct!=null?signPct(p.plPct):'–'}</b></td>
  <td>${p.value!=null?money(p.value,p.cur):'–'}</td>
  <td>${money(p.cost,p.cur)}</td>
  <td>${nfmt(p.units,4)}</td><td>${nfmt(p.avg,4)}</td>
  <td><input class="px" data-k="${esc(p.key)}" value="${p.last!=null?p.last:''}" placeholder="precio" inputmode="decimal" onchange="pfSetPx(this)" style="width:90px"><div class="mu">${p.ts?esc((p.src||'')+' · '+new Date(p.ts).toLocaleDateString('es-ES')):''}</div></td>
  <td>${p.value!=null?nfmt(p.value/totalVal*100,1)+' %':'–'}</td></tr>`).join('');
 const lots=[...PF.lots].reverse().map(l=>`<tr><td>${esc(l.date||'')}</td><td>${l.side==='sell'?'Venta':'Compra'}</td><td>${esc(l.name)}</td><td>${nfmt(l.units,4)}</td><td>${nfmt(l.price,4)}</td><td>${l.fees?nfmt(l.fees):''}</td><td><a href="#" onclick="pfDelLot(${l.id});return false">quitar</a></td></tr>`).join('');
 const sel=PF.xray;
 root.innerHTML=`
 <p class="mu">Añade tus compras y ve de un vistazo cuánto ganas o pierdes. Todo se guarda <b>solo en este dispositivo</b>.
 Los PDF de Morningstar (ficha y X-Ray) no incluyen tus importes, por eso las participaciones y el precio de compra los introduces tú (los encuentras en tu broker).</p>
 ${tiles||'<div class="card mu">Aún no tienes posiciones. Añade tu primera compra abajo.</div>'}
 ${rows?`<div style="overflow-x:auto"><table><tr><th>Posición</th><th>Part.</th><th>P. medio</th><th>Precio actual</th><th>Invertido</th><th>Valor</th><th>G/P</th><th>G/P %</th><th>Peso</th></tr>${rows}</table></div>`:''}
 <div class="row" style="margin:10px 0"><button class="btn" onclick="pfRefresh()">🔄 Actualizar precios (acciones/ETF)</button>
 <label class="btn">📄 Actualizar VL de fondos desde ficha PDF<input type="file" accept="application/pdf" multiple hidden onchange="pfPdfNav([...this.files]);this.value=''"></label></div>
 <div id="pf_upd" class="mu"></div>
 <details id="pf_form" class="card" ${(pfOpen||!PF.lots.length)?'open':''} ontoggle="pfOpen=this.open"><summary>➕ Añadir operación</summary>
  <div class="cats">
   <label class="mu">Operación<select id="pf_side" style="display:block;width:100%;padding:8px"><option value="buy">Compra</option><option value="sell">Venta</option></select></label>
   <label class="mu">Tipo<select id="pf_type" style="display:block;width:100%;padding:8px"><option value="fondo">Fondo</option><option value="accion">Acción</option><option value="etf">ETF</option></select></label>
   <label class="mu">Nombre<input id="pf_name" style="display:block;max-width:none"></label>
   <label class="mu">ISIN (fondos) o ticker (acciones)<input id="pf_key" style="display:block;max-width:none" placeholder="IE0032126645 / AAPL"></label>
   <label class="mu">Participaciones / acciones<input id="pf_units" inputmode="decimal" style="display:block;max-width:none"></label>
   <label class="mu">Precio de la operación (por participación)<input id="pf_price" inputmode="decimal" style="display:block;max-width:none"></label>
   <label class="mu">Comisiones (opcional)<input id="pf_fees" inputmode="decimal" style="display:block;max-width:none"></label>
   <label class="mu">Fecha<input id="pf_date" type="date" style="display:block;max-width:none"></label>
   <label class="mu">Divisa<input id="pf_cur" value="EUR" style="display:block;max-width:none"></label>
   <label class="mu">Precio actual (opcional)<input id="pf_cur_px" inputmode="decimal" style="display:block;max-width:none"></label>
  </div><button class="btn p" onclick="pfAdd()">Añadir</button> <span id="pf_msg"></span></details>
 ${lots?`<details class="card"><summary>Historial de operaciones (${PF.lots.length})</summary><div style="overflow-x:auto"><table><tr><th>Fecha</th><th></th><th>Nombre</th><th>Part.</th><th>Precio</th><th>Com.</th><th></th></tr>${lots}</table></div></details>`:''}
 <div class="card"><b>X-Ray de cartera (Morningstar)</b><p class="mu">Sube tu PDF «X-Ray de Cartera» para ver cómo está repartida y qué concentraciones tienes.</p>
  <input type="file" accept="application/pdf" onchange="pfXray([...this.files]);this.value=''"></div>
 ${sel?xrayHtml(sel):''}
 <div class="row" style="margin:10px 0"><button class="btn" onclick="pfExport()">⬇️ Copia de seguridad</button>
 <label class="btn">⬆️ Restaurar<input type="file" accept="application/json" hidden onchange="pfImport(this.files[0]);this.value=''"></label>
 <button class="btn" onclick="pfClear()">🗑️ Borrar cartera</button></div>
 <p class="mu">Cálculo con coste medio ponderado; no incluye impuestos ni conversión de divisas (cada divisa se resume por separado).</p>`;
 for(const [i,v] of Object.entries(keep)){const e=document.getElementById(i);if(e)e.value=v;}}
function pfExport(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(PF,null,1)],{type:'application/json'}));a.download='mi-cartera.json';a.click();}
function pfImport(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=JSON.parse(r.result);PF={lots:s.lots||[],px:s.px||{},xray:s.xray||null};pfSave();pfRender();}catch(e){alert('Archivo no válido');}};r.readAsText(f);}
