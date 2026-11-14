// ===== Datos en tiempo real con Finnhub (clave gratuita, funciona en el navegador/Android) =====
const FH='https://finnhub.io/api/v1';
const LS={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const fhKey=()=>(LS.get('fh_key')||'').trim();
async function fh(path,key){const r=await fetch(FH+path+(path.includes('?')?'&':'?')+'token='+encodeURIComponent(key));
 if(r.status===429)throw new Error('límite de consultas de Finnhub (espera un minuto)');
 if(r.status===401||r.status===403)throw new Error('clave de Finnhub no válida o sin acceso a este valor');
 if(!r.ok)throw new Error('error '+r.status);return r.json();}
const pct=v=>v==null?null:v/100;
async function fundamentals(t,key){ // fundamentales: se cachean 12 h para ahorrar consultas
 const ck='fh_f_'+t;try{const c=JSON.parse(LS.get(ck)||'null');if(c&&Date.now()-c.ts<432e5)return c.d;}catch(e){}
 const [m,p]=await Promise.all([fh('/stock/metric?symbol='+t+'&metric=all',key),fh('/stock/profile2?symbol='+t,key)]);
 const x=m.metric||{};
 const d={name:p.name||t,sector:p.finnhubIndustry,currency:p.currency||'USD',
  pe:x.peTTM??x.peNormalizedAnnual??null,roe:pct(x.roeTTM),margin:pct(x.netProfitMarginTTM),
  debt_equity:x['totalDebt/totalEquityQuarterly']!=null?x['totalDebt/totalEquityQuarterly']*100:null,
  rev_growth:pct(x.revenueGrowthTTMYoy),earn_growth:pct(x.epsGrowthTTMYoy),ret_6m:pct(x['26WeekPriceReturnDaily']),
  high_52w:x['52WeekHigh']??null,beta:x.beta??null,fcf_yield:x.pfcfShareTTM>0?1/x.pfcfShareTTM:null};
 LS.set(ck,JSON.stringify({ts:Date.now(),d}));return d;}
async function liveRow(t,key){
 const q=await fh('/quote?symbol='+t,key);if(!q||!q.c)throw new Error('ticker no encontrado en Finnhub (la versión gratuita solo cubre EE. UU.)');
 const f=await fundamentals(t,key);
 return {...f,ticker:t,price:q.c,day_change:q.dp,source:'finnhub',updated:Date.now()};}
async function runFinnhub(tickers){
 const key=fhKey(),list=(tickers.length?tickers:UNIVERSE).slice(0,25),results=[],errors=[];
 for(let i=0;i<list.length;i+=5){ // lotes de 5 para respetar el límite (60/min)
  await Promise.all(list.slice(i,i+5).map(async t=>{try{results.push(analyzeRaw(await liveRow(t,key)));}catch(e){errors.push({ticker:t,error:e.message});}}));}
 results.sort((a,b)=>(b.score||0)-(a.score||0));return {mode:'live-finnhub',results,errors};}
// WebSocket: precio en directo de las candidatas (solo EE. UU.)
let _ws=null;
function liveSocket(tickers){
 try{if(_ws)_ws.close();const key=fhKey();if(!key||!tickers.length)return;
  _ws=new WebSocket('wss://ws.finnhub.io?token='+encodeURIComponent(key));
  _ws.onopen=()=>tickers.slice(0,15).forEach(s=>_ws.send(JSON.stringify({type:'subscribe',symbol:s})));
  _ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type!=='trade')return;
   for(const tr of m.data){const el=document.getElementById('px-'+tr.s);if(el){el.textContent=tr.p.toFixed(2);el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),400);}}};
 }catch(e){}}
