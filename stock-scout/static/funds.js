// ===== Motor de FONDOS + lector de PDF de Morningstar =====
const FUND_METRICS=[
 ["ter","Gastos corrientes (TER)","costes",0.02,0.002,v=>(v*100).toFixed(2)+'%',
  ["Muy caro: cada año se come una parte grande de tu rentabilidad.","Coste normal para un fondo activo.","Barato: casi toda la rentabilidad llega a tu bolsillo."],
  "El coste es lo único que controlas. 1% extra al año durante 30 años puede restar ~25% del capital final. Los indexados cuestan 0,1-0,3%."],
 ["ret3_rel","Rentab. 3 años vs categoría","rentabilidad",-0.03,0.03,v=>(v>=0?'+':'')+(v*100).toFixed(1)+' pts',
  ["Pierde frente a la media de fondos comparables.","En línea con su categoría.","Supera a su categoría de forma clara."],
  "Compara siempre contra su categoría, no en absoluto: un fondo de renta fija y uno de bolsa no son comparables."],
 ["ret3_abs","Rentabilidad anualizada 3 años","rentabilidad",0,0.12,v=>(v*100).toFixed(1)+'%',
  ["Rentabilidad nula o negativa en 3 años.","Rentabilidad moderada.","Rentabilidad alta (ojo: puede deberse a un ciclo favorable)."],
  "Tres años es poco: puede ser suerte de ciclo. Mira también 5 y 10 años."],
 ["ret5_rel","Rentab. 5 años vs categoría","rentabilidad",-0.03,0.03,v=>(v>=0?'+':'')+(v*100).toFixed(1)+' pts',
  ["A 5 años va por detrás de su categoría.","A 5 años, en línea con su categoría.","A 5 años supera a su categoría: consistencia."],
  "La consistencia a 5+ años pesa más que un buen último año. Pocos fondos activos baten a su índice de forma sostenida."],
 ["ret5_abs","Rentabilidad anualizada 5 años","rentabilidad",0,0.10,v=>(v*100).toFixed(1)+'%',
  ["Rentabilidad nula o negativa a 5 años.","Rentabilidad moderada a 5 años.","Rentabilidad alta a 5 años."],
  "Las rentabilidades pasadas no garantizan las futuras; úsalas para descartar, no para elegir."],
 ["sharpe","Ratio de Sharpe","riesgo",0,1.2,v=>v.toFixed(2),
  ["Poca rentabilidad por unidad de riesgo asumido.","Relación rentabilidad/riesgo aceptable.","Muy buena rentabilidad por cada unidad de riesgo."],
  "Sharpe = (rentabilidad − tipo sin riesgo) / volatilidad. > 1 es bueno. Compáralo solo dentro de la misma categoría."],
 ["vol","Volatilidad (desv. estándar)","riesgo",0.25,0.08,v=>(v*100).toFixed(1)+'%',
  ["Volatilidad alta: el fondo oscila mucho.","Volatilidad media.","Volatilidad baja."],
  "Renta variable global ronda 14-17%, renta fija 3-6%. Pregúntate si podrías aguantar ver caer el fondo esa cifra sin vender."],
 ["max_dd","Caída máxima histórica","riesgo",0.40,0.10,v=>(v*100).toFixed(1)+'%',
  ["Ha llegado a perder mucho: prepárate para ese escenario.","Caídas máximas moderadas.","Caídas máximas contenidas."],
  "La caída máxima te dice lo peor que ha pasado. Si perder ese % te haría vender, el fondo no es para ti."],
 ["alpha","Alfa","riesgo",-3,3,v=>v.toFixed(2),
  ["El gestor resta valor frente a su índice.","El gestor aporta poco sobre el índice.","El gestor aporta valor real sobre el índice."],
  "Alfa es la rentabilidad por encima de la que explica el riesgo de mercado. Un alfa persistente es muy raro."],
 ["stars","Rating Morningstar (estrellas)","calidad",2,5,v=>'★'.repeat(Math.round(v))+' ('+v+')',
  ["Rating bajo: históricamente flojo frente a su categoría.","Rating medio.","Rating alto."],
  "Las estrellas miran el pasado (rentabilidad ajustada por riesgo y costes). Sirven para filtrar, no para predecir."],
 ["size","Patrimonio (M)","calidad",20,300,v=>Math.round(v)+' M',
  ["Muy pequeño: riesgo de cierre o fusión.","Tamaño suficiente.","Tamaño sólido."],
  "Los fondos muy pequeños pueden cerrar o fusionarse. Los gigantes pueden perder agilidad; busca un punto medio."],
 ["age","Antigüedad (años)","calidad",2,8,v=>v.toFixed(0)+' años',
  ["Muy joven: historial insuficiente.","Historial razonable.","Largo historial que incluye distintos ciclos."],
  "Un historial que atraviese una crisis (2008, 2020, 2022) enseña mucho más que uno de años buenos."]
];
const FUND_CATS={costes:["Costes",0.25],rentabilidad:["Rentabilidad y consistencia",0.30],riesgo:["Riesgo ajustado",0.30],calidad:["Calidad y solidez",0.15]};
function analyzeFund(raw){
 const d={...raw};
 d.ret3_rel=(raw.ret3!=null&&raw.cat_ret3!=null)?raw.ret3-raw.cat_ret3:null;
 d.ret5_rel=(raw.ret5!=null&&raw.cat_ret5!=null)?raw.ret5-raw.cat_ret5:null;
 d.ret3_abs=d.ret3_rel==null?raw.ret3??null:null; d.ret5_abs=d.ret5_rel==null?raw.ret5??null:null;
 const findings=[],cs={};
 for(const [key,label,cat,bad,good,fmt,texts,lesson] of FUND_METRICS){
  const v=d[key]; if(v==null||isNaN(v))continue;
  const s=Math.max(0,Math.min(1,(v-bad)/(good-bad)))*100,lv=s<35?0:(s<65?1:2);
  findings.push({key,label,category:cat,value:fmt(v),score:Math.round(s),level:['bad','mid','good'][lv],text:texts[lv],lesson});
  (cs[cat]=cs[cat]||[]).push(s);}
 const cats=[];let tot=0,ws=0;
 for(const [k,[name,w]] of Object.entries(FUND_CATS)){const a=cs[k];if(a){const avg=a.reduce((x,y)=>x+y)/a.length;cats.push({key:k,name,score:Math.round(avg),weight:w});tot+=avg*w;ws+=w;}}
 const score=ws?Math.round(tot/ws):null,flags=[];
 if(d.ter>0.015)flags.push('Costes elevados (TER > 1,5%).');
 if(d.size!=null&&d.size<20)flags.push('Patrimonio muy pequeño (< 20 M): riesgo de cierre.');
 if(d.age!=null&&d.age<3)flags.push('Menos de 3 años de historial.');
 if(raw.ret3!=null&&raw.ret3<0)flags.push('Rentabilidad negativa a 3 años.');
 if(d.stars!=null&&d.stars<=2)flags.push('Rating Morningstar bajo (≤ 2 estrellas).');
 if(findings.length<4)flags.push('Pocos datos: la nota es poco fiable.');
 const verdict=score==null?'Sin datos':(score>=68&&!flags.length)?'Interesante':score>=55?'A vigilar':'Poco atractivo';
 const pos=[...findings].sort((a,b)=>b.score-a.score).filter(f=>f.level==='good').slice(0,3);
 const neg=[...findings].sort((a,b)=>a.score-b.score).filter(f=>f.level==='bad').slice(0,3);
 let summary='No hay datos suficientes.';
 if(score!=null){summary=`${raw.name} obtiene ${score}/100 (${verdict}). `;
  if(pos.length)summary+='Lo mejor: '+pos.map(f=>f.label.toLowerCase()).join('; ')+'. ';
  if(neg.length)summary+='Lo peor: '+neg.map(f=>f.label.toLowerCase()).join('; ')+'. ';
  summary+='Cribado orientativo: compara con otros fondos de su categoría y revisa la política de inversión.';}
 return {ticker:raw.isin||'FONDO',name:raw.name,sector:raw.category||'Fondo',price:null,currency:'',score,verdict,categories:cats,findings,flags,summary};}

// ---- Lector de texto de fichas Morningstar (ES/EN, mejor esfuerzo) ----
function _n(s){if(s==null)return null;s=String(s).trim();
 if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');
 const v=parseFloat(s);return isNaN(v)?null:v;}
function parseMorningstar(text){
 const t=text.replace(/\s+/g,' '),out={},f=(re)=>{const m=t.match(re);return m?m:null;};
 let m;
 if(m=f(/ISIN\s+([A-Z]{2}[A-Z0-9]{9}[0-9])\b/)||f(/\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/))out.isin=m[1];
 if(m=f(/Informe a \d{1,2} \S+ \d{4}\s+(.+?)\s+Categor[ií]a Morningstar/i))out.name=m[1].trim();
 if(m=f(/VL\s*\((\d{2}\/\d{2}\/\d{4})\)\s*([A-Z]{3})\s*([\d.,]+)/)){out.nav=_n(m[3]);out.cur=m[2];out.nav_date=m[1];}
 if(m=f(/Rating Morningstar\S{0,2}\s*(Q{1,5})\b/))out.stars=m[1].length;
 else if(m=f(/(?:Rating Morningstar|Morningstar Rating|Calificaci[oó]n Morningstar|Rating General)[^\d★]{0,40}([1-5])(?!\d)/i))out.stars=+m[1];
 else if(m=f(/Morningstar[^★]{0,60}(★{1,5})/i))out.stars=m[1].length;
 if(m=f(/(?:Gastos corrientes|Ongoing Charge|Gastos Corrientes|Comisi[oó]n corriente|\bTER\b)[^\d]{0,40}(\d+(?:[.,]\d+)?)\s*%/i))out.ter=_n(m[1])/100;
 if(m=f(/Sharpe(?:\s*\d{1,2}\s*(?:a[ñn]os|a|years?|yrs?|y)\b\.?)?[^\d-]{0,40}(-?\d+(?:[.,]\d+)?)/i))out.sharpe=_n(m[1]);
 if(m=f(/(?:Desviaci[oó]n est[aá]ndar|Standard Deviation|Std Dev|Volatilidad(?: a)?)(?:\s*\d{1,2}\s*(?:a[ñn]os|a|years?|yrs?|y)\b\.?)?[^\d-]{0,40}(\d+(?:[.,]\d+)?)/i))out.vol=_n(m[1])/100;
 if(m=f(/(?:\bAlfa\b|\bAlpha\b)(?:\s*\d{1,2}\s*(?:a[ñn]os|a|years?|yrs?|y)\b\.?)?[^\d-]{0,40}(-?\d+(?:[.,]\d+)?)/i))out.alpha=_n(m[1]);
 if(m=f(/(?:Ca[ií]da m[aá]xima|Max(?:imum)? Drawdown)(?:\s*\d{1,2}\s*(?:a[ñn]os|a|years?|yrs?|y)\b\.?)?[^\d-]{0,30}(-?\d+(?:[.,]\d+)?)/i))out.max_dd=Math.abs(_n(m[1]))/100;
 const NUM='(-?\\d+[.,]\\d+)';
 for(const [yr,k,kc] of [[3,'ret3','cat_ret3'],[5,'ret5','cat_ret5']]){
  const tb=t.match(new RegExp(yr+' a[ñn]os anualiz\\.?\\s+'+NUM+'\\s+'+NUM+'\\s+'+NUM,'i'));
  if(tb){out[k]=_n(tb[1])/100;out[kc]=_n(tb[3])/100;}
  else if(m=f(new RegExp('(?:'+yr+' a[ñn]os|'+yr+' Year|'+yr+'Y|'+yr+' Yr)[^\\d-]{0,20}'+NUM,'i')))out[k]=_n(m[1])/100;}
 if(m=f(/Patrimonio de la serie \(mill\)\s*(?:\(\d{2}\/\d{2}\/\d{4}\)\s*)?([\d.,]+)/i))out.size=_n(m[1]);
 else if(m=f(/(?:Patrimonio(?: del fondo)?|Tama[ñn]o del fondo|Fund Size|Net Assets)[^\d]{0,50}(\d[\d.,]*)\s*(mil millones|bn|billion|millones|mill|mln|m\b)?/i)){
  let v=_n(m[1]);if(v!=null){if(/mil millones|bn|billion/i.test(m[2]||''))v*=1000;out.size=v;}}
 if(m=f(/(?:Fecha de lanzamiento|Fecha de inicio|Inception Date|Fecha de creaci[oó]n|Fecha Creaci[oó]n)[^\d]{0,30}(?:\d{1,2}[\/.\-\s]+(?:\d{1,2}|[A-Za-zñ]+)[\/.\-\s]+)?(\d{4})/i))out.age=new Date().getFullYear()-(+m[1]);
 if(m=f(/Categor[ií]a Morningstar\S{0,2}\s+(.+?)\s+Benchmark Morningstar/i))out.category=m[1].trim();
 else if(m=f(/(?:Categor[ií]a Morningstar|Morningstar Category)[: ]+([^\d★]{3,60}?)(?= {2}| Rating| Gastos| Ongoing|$)/i))out.category=m[1].trim();
 return out;}
async function pdfText(file){
 if(!window.pdfjsLib){await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=ok;s.onerror=()=>ko(new Error('No se pudo cargar el lector de PDF (hace falta conexión a internet)'));document.head.appendChild(s);});
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';}
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let txt='';
 for(let i=1;i<=Math.min(pdf.numPages,8);i++){const p=await pdf.getPage(i);txt+=(await p.getTextContent()).items.map(x=>x.str).join(' ')+' ';}
 return txt;}

// ---- UI de fondos ----
const FFIELDS=[["name","Nombre del fondo",0],["isin","ISIN",0],["category","Categoría",0],["ter","Gastos corrientes %",1],["stars","Estrellas Morningstar (1-5)",0],
 ["ret3","Rentab. anualizada 3 años %",1],["cat_ret3","Media categoría 3 años %",1],["ret5","Rentab. anualizada 5 años %",1],["cat_ret5","Media categoría 5 años %",1],
 ["sharpe","Ratio de Sharpe",0],["vol","Volatilidad (desv. estándar) %",1],["max_dd","Caída máxima %",1],["alpha","Alfa",0],["size","Patrimonio (millones)",0],["age","Antigüedad (años)",0],["nav","Valor liquidativo (VL)",0],["cur","Divisa",0]];
let FUNDS=[];try{FUNDS=JSON.parse(localStorage.getItem('funds')||'[]');}catch(e){}
function fundFormInit(){
 const box=document.getElementById('fundForm');
 box.innerHTML=FFIELDS.map(([k,l])=>`<label class="mu" style="display:block">${l}<input id="f_${k}" ${['name','isin','category','cur'].includes(k)?'':'inputmode="decimal"'} style="display:block;max-width:none"></label>`).join('');
 renderFunds();}
function fundFill(o,fname){
 for(const [k,,pct] of FFIELDS){const el=document.getElementById('f_'+k);if(!el)continue;
  let v=o[k];if(k==='name'&&!v)v=(fname||'').replace(/\.pdf$/i,'');
  if(v!=null&&pct&&typeof v==='number')v=+(v*100).toFixed(3);
  el.value=v==null?'':v;el.style.outline=(o[k]!=null)?'2px solid var(--g)':'';}}
function fundRead(){const o={};
 for(const [k,,pct] of FFIELDS){const v=document.getElementById('f_'+k).value.trim();
  if(['name','isin','category','cur'].includes(k))o[k]=v;else if(v!==''){let x=parseFloat(v.replace(',','.'));if(!isNaN(x))o[k]=pct?x/100:x;}}
 if(!o.name)o.name=o.isin||'Fondo sin nombre';return o;}
async function fundPdfs(files){
 const st=document.getElementById('fundMsg');
 for(const file of files){st.textContent='Leyendo '+file.name+'…';
  try{const o=parseMorningstar(await pdfText(file));fundFill(o,file.name);
   const n=Object.keys(o).length;st.innerHTML=`<b>${esc(file.name)}</b>: se han detectado ${n} campos (resaltados en verde). <b>Revísalos y completa los que falten</b>, luego pulsa «Añadir al análisis».`;
   if(files.length>1){addFund();}
  }catch(e){st.textContent='Error: '+e.message+'. Puedes introducir los datos a mano.';}}}
function fundToPortfolio(){const o=fundRead();pfPrefill({type:'fondo',name:o.name,key:o.isin||'',price:o.nav,cur:o.cur||'EUR'});}
function addFund(){FUNDS.push(fundRead());FUNDS=FUNDS.slice(-30);try{localStorage.setItem('funds',JSON.stringify(FUNDS));}catch(e){}renderFunds();}
function delFund(i){FUNDS.splice(i,1);try{localStorage.setItem('funds',JSON.stringify(FUNDS));}catch(e){}renderFunds();}
function renderFunds(){
 const out=document.getElementById('fundOut');if(!FUNDS.length){out.innerHTML='<p class="mu">Aún no has añadido fondos. Sube uno o varios PDF de Morningstar, o rellena el formulario.</p>';return;}
 const rs=FUNDS.map((f,i)=>({r:analyzeFund(f),i})).sort((a,b)=>(b.r.score||0)-(a.r.score||0));
 out.innerHTML=`<table><tr><th>#</th><th>Fondo</th><th>Nota</th><th>Veredicto</th><th></th></tr>${rs.map((x,n)=>`<tr><td>${n+1}</td><td>${esc(x.r.name)}</td><td class="${cls(x.r.score)}"><b>${x.r.score??'–'}</b></td><td>${esc(x.r.verdict)}</td><td><a href="#" onclick="delFund(${x.i});return false">quitar</a></td></tr>`).join('')}</table>`+rs.map(x=>card(x.r,false)).join('');}
