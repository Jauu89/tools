(function () {
  "use strict";

  var M = window.Modelo;

  // ---------------------------------------------------------------- Ajustes y almacenamiento
  var KZ = "boletus-lugo:zonas:v1", KZS = "boletus-lugo:zona-sel:v1", KP = "boletus-lugo:params:v1";
  var KM = "boletus-lugo:meteo:v1", KE = "boletus-lugo:esp:v1", KV = "boletus-lugo:vista:v1";
  var PASADOS = 30, FUTURO = 14, VISTA_ATRAS = 21, TTL_MIN = 60;
  var ZONA_DEFECTO = { id: "z0", nombre: "Entre O Corgo y Castroverde", lat: 43.02, lng: -7.38 };
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsJson(k, def) { try { var v = JSON.parse(lsGet(k)); return v == null ? def : v; } catch (e) { return def; } }

  // Crea elementos con textContent (los nombres de zona vienen del usuario)
  function h(tag, props) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "text") e.textContent = props[k];
      else if (k === "class") e.className = props[k];
      else e.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }
  function vaciar(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function fmt(v, d) { return v == null || !isFinite(v) ? "–" : Number(v).toFixed(d == null ? 1 : d).replace(".", ","); }
  function fechaCorta(iso) { return Number(iso.slice(8, 10)) + " " + MESES[Number(iso.slice(5, 7)) - 1]; }
  function diaSemana(iso) {
    var p = iso.split("-").map(Number);
    return DIAS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  }
  function r2(v) { return Math.round(Number(v) * 100) / 100; }

  // ---------------------------------------------------------------- Zonas
  var zonas = [], zonaId = null;
  function cargarZonas() {
    var arr = lsJson(KZ, []);
    zonas = (Array.isArray(arr) ? arr : []).map(function (z) {
      if (!z || typeof z !== "object") return null;
      var lat = Number(z.lat), lng = Number(z.lng);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { id: String(z.id || "z" + Math.random().toString(36).slice(2, 8)).slice(0, 30),
               nombre: String(z.nombre || "Zona").slice(0, 60), lat: r2(lat), lng: r2(lng) };
    }).filter(Boolean);
    if (!zonas.length) zonas = [ZONA_DEFECTO];
    var sel = lsGet(KZS);
    zonaId = zonas.some(function (z) { return z.id === sel; }) ? sel : zonas[0].id;
  }
  function guardarZonas() { lsSet(KZ, JSON.stringify(zonas)); lsSet(KZS, zonaId); }
  function zonaActual() { return zonas.filter(function (z) { return z.id === zonaId; })[0] || zonas[0]; }

  function pintarSelectorZona() {
    var s = $("zona"); vaciar(s);
    zonas.forEach(function (z) {
      var o = h("option", { value: z.id, text: z.nombre }); if (z.id === zonaId) o.selected = true; s.appendChild(o);
    });
    var b = $("b-borrar-zona");
    if (b) b.hidden = zonas.length < 2;
  }

  // ---------------------------------------------------------------- Parámetros del modelo (editables)
  var CAMPOS = [
    ["lluviaMm", "Lluvia necesaria (mm)", 5, 200], ["dias", "…acumulada en (días)", 2, 14],
    ["minDiasLluvia", "Días con lluvia (≥1 mm), al menos", 1, 14],
    ["ret0", "Retraso mínimo hasta que salen (días)", 3, 30], ["ret1", "Retraso máximo (días)", 3, 40],
    ["tx0", "Tmáx ideal, mínima (°C)", -5, 40], ["tx1", "Tmáx ideal, máxima (°C)", -5, 45],
    ["tminMin", "Noche mínima ideal (°C)", -5, 25],
    ["desde", "Temporada desde (MM-DD)"], ["hasta", "…hasta (MM-DD)"]
  ];
  function pad2(n) { return ("0" + n).slice(-2); }
  function aPlano(p) {
    return { lluviaMm: p.lluviaMm, dias: p.dias, minDiasLluvia: p.minDiasLluvia, ret0: p.retraso[0], ret1: p.retraso[1],
             tx0: p.tmax[0], tx1: p.tmax[1], tminMin: p.tminMin,
             desde: pad2(p.desde[0]) + "-" + pad2(p.desde[1]), hasta: pad2(p.hasta[0]) + "-" + pad2(p.hasta[1]) };
  }
  function deMD(s) { var m = /^(\d{1,2})-(\d{1,2})$/.exec(String(s).trim()); return m ? [Number(m[1]), Number(m[2])] : null; }
  function dePlano(base, pl) {
    var p = JSON.parse(JSON.stringify(base));
    p.lluviaMm = pl.lluviaMm; p.dias = pl.dias; p.minDiasLluvia = pl.minDiasLluvia;
    p.retraso = [pl.ret0, pl.ret1]; p.tmax = [pl.tx0, pl.tx1]; p.tminMin = pl.tminMin;
    p.desde = deMD(pl.desde) || base.desde; p.hasta = deMD(pl.hasta) || base.hasta;
    return p;
  }
  function validarPlano(pl) {
    for (var i = 0; i < CAMPOS.length; i++) {
      var c = CAMPOS[i], v = pl[c[0]];
      if (c[0] === "desde" || c[0] === "hasta") {
        var md = deMD(v);
        if (!md || md[0] < 1 || md[0] > 12 || md[1] < 1 || md[1] > 31) return "«" + c[1] + "» debe ser MM-DD, por ejemplo 08-20.";
      } else if (typeof v !== "number" || !isFinite(v) || v < c[2] || v > c[3]) {
        return "«" + c[1] + "» debe estar entre " + c[2] + " y " + c[3] + ".";
      }
    }
    if (pl.ret0 > pl.ret1) return "El retraso mínimo no puede superar al máximo.";
    if (pl.tx0 >= pl.tx1) return "La Tmáx ideal mínima debe ser menor que la máxima.";
    if (pl.minDiasLluvia > pl.dias) return "Los días con lluvia no pueden superar los días de la ventana.";
    return "";
  }
  var overrides = lsJson(KP, {});
  function paramsDe(id) {
    var base = M.DEFECTO[id], pl = overrides[id];
    if (!pl || validarPlano(Object.assign(aPlano(base), pl))) return base;
    return dePlano(base, Object.assign(aPlano(base), pl));
  }

  // ---------------------------------------------------------------- Datos de Open-Meteo
  var datos = null, estadoDatos = { t: 0, deCache: false };

  function urlOpenMeteo(z) {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + r2(z.lat) + "&longitude=" + r2(z.lng) +
      "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&hourly=soil_moisture_3_to_9cm" +
      "&past_days=" + PASADOS + "&forecast_days=" + FUTURO + "&timezone=Europe%2FMadrid";
  }
  function hoyMadrid() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()); }
    catch (e) { return null; }
  }
  function parsear(j) {
    if (!j || !j.daily || !Array.isArray(j.daily.time) || !j.daily.time.length) throw new Error("Respuesta inesperada de Open-Meteo.");
    var d = j.daily, n = d.time.length;
    var suma = {}, cuenta = {};
    if (j.hourly && Array.isArray(j.hourly.time) && Array.isArray(j.hourly.soil_moisture_3_to_9cm)) {
      j.hourly.time.forEach(function (t, i) {
        var v = j.hourly.soil_moisture_3_to_9cm[i], k = String(t).slice(0, 10);
        if (typeof v === "number" && isFinite(v)) { suma[k] = (suma[k] || 0) + v; cuenta[k] = (cuenta[k] || 0) + 1; }
      });
    }
    var out = { fechas: d.time.map(String), lluvia: [], tmax: [], tmin: [], suelo: [], elevacion: Number(j.elevation) };
    for (var i = 0; i < n; i++) {
      out.lluvia.push(typeof d.precipitation_sum[i] === "number" ? d.precipitation_sum[i] : null);
      out.tmax.push(typeof d.temperature_2m_max[i] === "number" ? d.temperature_2m_max[i] : null);
      out.tmin.push(typeof d.temperature_2m_min[i] === "number" ? d.temperature_2m_min[i] : null);
      var k = out.fechas[i];
      out.suelo.push(cuenta[k] ? Math.round(suma[k] / cuenta[k] * 1000) / 1000 : null);
    }
    var hoy = hoyMadrid(), idx = hoy ? out.fechas.indexOf(hoy) : -1;
    out.h = idx >= 0 ? idx : Math.min(PASADOS, n - 1);
    return out;
  }

  function claveCache(z) { return r2(z.lat) + "," + r2(z.lng); }
  function leerCache(z) { var c = lsJson(KM, {}); return c && c[claveCache(z)] ? c[claveCache(z)] : null; }
  function guardarCache(z, d) {
    var c = lsJson(KM, {}); if (!c || typeof c !== "object") c = {};
    c[claveCache(z)] = { t: Date.now(), d: d };
    var claves = Object.keys(c);
    if (claves.length > 8) delete c[claves.sort(function (a, b) { return c[a].t - c[b].t; })[0]];
    lsSet(KM, JSON.stringify(c));
  }

  function hace(ms) {
    var m = Math.round(ms / 60000);
    if (m < 1) return "ahora mismo"; if (m < 60) return "hace " + m + " min";
    var hh = Math.round(m / 60); return hh < 48 ? "hace " + hh + " h" : "hace " + Math.round(hh / 24) + " días";
  }
  function pintarEstadoDatos() {
    var el = $("estado-datos");
    el.textContent = !estadoDatos.t ? "" :
      (estadoDatos.deCache ? "Sin conexión: datos guardados " : "Actualizado ") + hace(Date.now() - estadoDatos.t) +
      (datos && isFinite(datos.elevacion) ? " · altitud de la zona ≈ " + Math.round(datos.elevacion) + " m" : "");
  }
  function mostrarError(msg) { var e = $("aviso-error"); e.hidden = !msg; e.textContent = msg || ""; }

  function cargar(forzar) {
    var z = zonaActual(), viz = $("viz"), b = $("b-actualizar");
    mostrarError("");
    var c = leerCache(z);
    if (!forzar && c && Date.now() - c.t < TTL_MIN * 60000) {
      datos = c.d; estadoDatos = { t: c.t, deCache: false }; return pintarTodo();
    }
    viz.classList.add("cargando"); b.disabled = true;
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    return fetch(urlOpenMeteo(z), ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error("Open-Meteo respondió " + r.status); return r.json(); })
      .then(function (j) {
        datos = parsear(j); estadoDatos = { t: Date.now(), deCache: false }; guardarCache(z, datos);
      })
      .catch(function (err) {
        if (c) { datos = c.d; estadoDatos = { t: c.t, deCache: true };
                 mostrarError("No pude actualizar los datos (" + err.message + "). Te enseño los últimos que guardé."); }
        else { datos = null; estadoDatos = { t: 0, deCache: false };
               mostrarError("No pude obtener los datos de lluvia (" + err.message + "). Comprueba la conexión e inténtalo de nuevo."); }
      })
      .then(function () { clearTimeout(timer); viz.classList.remove("cargando"); b.disabled = false; pintarTodo(); });
  }

  // ---------------------------------------------------------------- Cifras
  function pintarTiles() {
    var t = $("tiles"); vaciar(t);
    if (!datos) return;
    var hh = datos.h;
    function tile(et, val, unidad) {
      return h("div", { class: "tile" }, h("div", { class: "et", text: et }),
        h("div", { class: "val" }, val, unidad ? h("small", { text: " " + unidad }) : null));
    }
    t.appendChild(tile("Lluvia, últimos 7 días", fmt(M.lluviaEntre(datos, hh - 6, hh)), "mm"));
    t.appendChild(tile("Lluvia, últimos 14 días", fmt(M.lluviaEntre(datos, hh - 13, hh)), "mm"));
    t.appendChild(tile("Lluvia prevista, próximos 7 días", fmt(M.lluviaEntre(datos, hh + 1, hh + 7)), "mm"));
    t.appendChild(tile("Humedad del suelo hoy (3–9 cm)", fmt(datos.suelo[hh], 2), "m³/m³"));
  }

  // ---------------------------------------------------------------- Tarjetas por especie
  var ICONOS = { alta: "✔", probable: "◐", posible: "○", adverso: "▼", nada: "–" };
  var ETIQ = { alta: "Alta probabilidad", probable: "Probable", posible: "Posible", adverso: "Condiciones adversas", nada: "Sin señal" };
  var especie = lsGet(KE) && M.DEFECTO[lsGet(KE)] ? lsGet(KE) : "edulis";

  function lineasVentana(v, p) {
    var out = [];
    var titulo = v.estado === "encurso" ? "En curso, hasta el " + fechaCorta(v.fechaHasta)
      : v.estado === "proxima" ? "Del " + fechaCorta(v.fechaDesde) + " al " + fechaCorta(v.fechaHasta)
      : "Terminó el " + fechaCorta(v.fechaHasta);
    out.push(["fecha", titulo]);
    var ll = fmt(v.mm) + " mm entre el " + fechaCorta(v.lluviaDesde) + " y el " + fechaCorta(v.lluviaHasta);
    if (v.prevista) ll += " · lluvia aún por caer: depende de la previsión";
    else if (v.extendida) ll += " · la previsión alarga la ventana";
    out.push(["", ll]);
    if (v.puntosTemp === null) out.push(["suave", "Aún no hay previsión de temperatura para esos días."]);
    else {
      var d = [];
      if (v.helada) d.push(v.helada + (v.helada === 1 ? " día" : " días") + " con helada");
      if (v.frio) d.push(v.frio + (v.frio === 1 ? " noche" : " noches") + " por debajo de " + p.tminMin + " °C");
      if (v.calor) d.push(v.calor + (v.calor === 1 ? " día" : " días") + " de calor excesivo");
      out.push(["suave", d.length ? "Temperatura: " + d.join(", ") + "." : "Temperaturas adecuadas."]);
    }
    return out;
  }

  function pintarTarjetas() {
    var cont = $("tarjetas"); vaciar(cont);
    if (!datos) return;
    M.ORDEN.forEach(function (id) {
      var p = paramsDe(id), r = M.resumen(datos, p, datos.h), v = r.principal;
      var nivel = v ? v.nivel : "nada";
      var lineas = [];
      if (v) lineas = lineasVentana(v, p);
      else if (!r.enTemporadaHoy) lineas = [["fecha", "Fuera de temporada"], ["suave", "Va del " + fechaCorta("2000-" + pad2(p.desde[0]) + "-" + pad2(p.desde[1])) +
        " al " + fechaCorta("2000-" + pad2(p.hasta[0]) + "-" + pad2(p.hasta[1])) + "."]];
      else lineas = [["fecha", "Sin ventana en las próximas 2 semanas"],
        ["suave", "Lluvia de los últimos " + p.dias + " días: " + fmt(r.lluviaUltimosDias) + " mm. Hacen falta " + p.lluviaMm + " mm repartidos en varios días."]];

      var card = h("button", { type: "button", class: "tarjeta", "data-id": id, "aria-pressed": String(id === especie) },
        h("h3", { text: p.nombre }), h("p", { class: "sci", text: p.sci }),
        h("span", { class: "nivel n-" + nivel }, h("span", { class: "ico", "aria-hidden": "true", text: ICONOS[nivel] }), ETIQ[nivel]));
      lineas.forEach(function (l) {
        card.appendChild(h("p", { class: l[0] === "fecha" ? "fecha" : "linea" + (l[0] === "suave" ? " suave" : ""), text: l[1] }));
      });
      card.addEventListener("click", function () {
        especie = id; lsSet(KE, id);
        [].forEach.call(cont.querySelectorAll(".tarjeta"), function (b) { b.setAttribute("aria-pressed", String(b === card)); });
        dibujar(); pintarLeyenda();
      });
      cont.appendChild(card);
    });
  }

  // ---------------------------------------------------------------- Gráfico
  var ML = 46, MR = 14, PANELES = [{ id: "lluvia", h: 150 }, { id: "temp", h: 130 }, { id: "suelo", h: 96 }];
  var geo = null, selIdx = null;

  function ticksNice(min, max, forzarCero) {
    var pasos = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500], paso = pasos[pasos.length - 1], i;
    if (max <= min) max = min + 1;
    for (i = 0; i < pasos.length; i++) if ((max - min) / pasos[i] <= 4) { paso = pasos[i]; break; }
    var lo = forzarCero ? 0 : Math.floor(min / paso + 1e-9) * paso, hi = Math.ceil(max / paso - 1e-9) * paso;
    if (hi === lo) hi = lo + paso;
    var t = []; for (var v = lo; v <= hi + paso / 1000; v += paso) t.push(Math.round(v * 1000) / 1000);
    return { lo: lo, hi: hi, ticks: t, paso: paso };
  }
  function fmtTick(v, paso) { return paso < 1 ? fmt(v, paso < 0.1 ? 2 : 1) : String(Math.round(v)); }
  function rn(v) { return Math.round(v * 10) / 10; }

  function barra(x, y, w, hh, r) {
    var b = y + hh; r = Math.min(r, hh, w / 2);
    if (hh <= 0) return "";
    return "M" + rn(x) + "," + rn(b) + "V" + rn(y + r) + "Q" + rn(x) + "," + rn(y) + " " + rn(x + r) + "," + rn(y) +
      "H" + rn(x + w - r) + "Q" + rn(x + w) + "," + rn(y) + " " + rn(x + w) + "," + rn(y + r) + "V" + rn(b) + "Z";
  }
  function trazo(arr, a, b, xs, ys) {
    var d = "", pen = false;
    for (var i = a; i <= b; i++) {
      var v = arr[i];
      if (v == null) { pen = false; continue; }
      d += (pen ? "L" : "M") + rn(xs(i)) + "," + rn(ys(v)); pen = true;
    }
    return d;
  }

  function dibujar() {
    var svg = $("svg"), wrap = $("viz-wrap");
    if (!datos) { svg.innerHTML = ""; svg.removeAttribute("viewBox"); $("tip").hidden = true; return; }
    var W = Math.max(300, Math.round(wrap.clientWidth || 600)), n = datos.fechas.length, hh = datos.h;
    var i0 = Math.max(0, hh - VISTA_ATRAS), i1 = n - 1, N = i1 - i0 + 1;
    var slot = (W - ML - MR) / N, bw = Math.min(24, Math.max(3, slot - 2));
    function xc(i) { return ML + (i - i0 + 0.5) * slot; }

    // geometría de paneles
    var y = 6, pa = {};
    PANELES.forEach(function (p) { pa[p.id] = { top: y + 22, bot: y + 22 + p.h, titulo: y + 12 }; y = pa[p.id].bot + 20; });
    var H = y + 22;

    // escalas
    var maxL = 0, i; for (i = i0; i <= i1; i++) if (datos.lluvia[i] > maxL) maxL = datos.lluvia[i];
    var tl = ticksNice(0, Math.max(5, maxL), true);
    var mn = 99, mx = -99;
    for (i = i0; i <= i1; i++) { if (datos.tmin[i] != null && datos.tmin[i] < mn) mn = datos.tmin[i]; if (datos.tmax[i] != null && datos.tmax[i] > mx) mx = datos.tmax[i]; }
    if (mn > mx) { mn = 0; mx = 20; }
    var tt = ticksNice(Math.min(mn, 0), Math.max(mx, 10), false);
    var sMn = 9, sMx = -9; for (i = i0; i <= i1; i++) if (datos.suelo[i] != null) { sMn = Math.min(sMn, datos.suelo[i]); sMx = Math.max(sMx, datos.suelo[i]); }
    if (sMn > sMx) { sMn = 0.1; sMx = 0.4; }
    var ts = ticksNice(sMn, sMx, false);
    function yL(v) { return pa.lluvia.bot - (v - tl.lo) / (tl.hi - tl.lo) * (pa.lluvia.bot - pa.lluvia.top); }
    function yT(v) { return pa.temp.bot - (v - tt.lo) / (tt.hi - tt.lo) * (pa.temp.bot - pa.temp.top); }
    function yS(v) { return pa.suelo.bot - (v - ts.lo) / (ts.hi - ts.lo) * (pa.suelo.bot - pa.suelo.top); }
    geo = { W: W, H: H, i0: i0, i1: i1, slot: slot, xc: xc, pa: pa, yT: yT, yS: yS };

    var s = [];
    var xIni = ML, xFin = W - MR;
    // zona de previsión
    var xPrev = xc(hh) + slot / 2;
    s.push('<rect x="' + rn(xPrev) + '" y="' + pa.lluvia.top + '" width="' + rn(xFin - xPrev) + '" height="' + (pa.suelo.bot - pa.lluvia.top) + '" fill="var(--wash)"/>');
    // bandas de ventana de la especie elegida
    var p = paramsDe(especie), vent = M.evaluar(datos, p, hh).filter(function (v) { return v.nivel !== "nada"; });
    vent.forEach(function (v) {
      var a = Math.max(v.desde, i0), b = Math.min(v.hasta, i1);
      if (a > b) return;
      var x1 = xc(a) - slot / 2, x2 = xc(b) + slot / 2;
      PANELES.forEach(function (pn) {
        var t = pa[pn.id].top, bb = pa[pn.id].bot;
        s.push('<rect x="' + rn(x1) + '" y="' + t + '" width="' + rn(x2 - x1) + '" height="' + pn.h + '" fill="var(--wash-strong)"/>');
        // bordes verticales: distinguen la ventana del sombreado de previsión
        if (a === v.desde) s.push('<line x1="' + rn(x1) + '" x2="' + rn(x1) + '" y1="' + t + '" y2="' + bb + '" stroke="var(--text-secondary)" stroke-width="1.5"/>');
        if (b === v.hasta) s.push('<line x1="' + rn(x2) + '" x2="' + rn(x2) + '" y1="' + t + '" y2="' + bb + '" stroke="var(--text-secondary)" stroke-width="1.5"/>');
      });
      if (x2 - x1 >= 96) s.push('<text class="etq" x="' + rn(x1 + 6) + '" y="' + (pa.lluvia.top + 26) + '">Ventana probable</text>');
    });
    // banda ideal de Tmáx
    var ya = Math.max(pa.temp.top, yT(p.tmax[1])), yb = Math.min(pa.temp.bot, yT(p.tmax[0]));
    if (yb > ya) s.push('<rect x="' + xIni + '" y="' + rn(ya) + '" width="' + rn(xFin - xIni) + '" height="' + rn(yb - ya) + '" fill="var(--wash)" stroke="var(--grid)" stroke-width="1"/>');

    // rejillas, ejes y rótulos de paneles
    function rej(panel, tk, yf, tot) {
      tk.ticks.forEach(function (v) {
        var yy = rn(yf(v));
        s.push('<line x1="' + xIni + '" x2="' + xFin + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--grid)" stroke-width="1"/>');
        s.push('<text x="' + (ML - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmtTick(v, tk.paso) + '</text>');
      });
      s.push('<line x1="' + xIni + '" x2="' + xFin + '" y1="' + pa[panel].bot + '" y2="' + pa[panel].bot + '" stroke="var(--axis)" stroke-width="1"/>');
    }
    rej("lluvia", tl, yL); rej("temp", tt, yT); rej("suelo", ts, yS);
    s.push('<text class="titulo-panel" x="' + ML + '" y="' + pa.lluvia.titulo + '">Lluvia diaria (mm)</text>');
    s.push('<text class="titulo-panel" x="' + ML + '" y="' + pa.temp.titulo + '">Temperatura (°C)</text>');
    s.push('<text class="titulo-panel" x="' + ML + '" y="' + pa.suelo.titulo + '">Humedad del suelo, 3–9 cm (m³/m³)</text>');

    // barras de lluvia: observada, previsión y previsión lejana
    var maxIdx = -1, maxVal = 0;
    for (i = i0; i <= i1; i++) {
      var v = datos.lluvia[i]; if (v == null) continue;
      if (v > maxVal) { maxVal = v; maxIdx = i; }
      var op = i <= hh ? 1 : (i <= hh + 7 ? 0.6 : 0.35);
      var yy = yL(v), d = barra(xc(i) - bw / 2, yy, bw, pa.lluvia.bot - yy, 4);
      if (d) s.push('<path d="' + d + '" fill="var(--series-rain)" fill-opacity="' + op + '"/>');
    }
    if (maxIdx >= 0 && maxVal >= 1) {
      var tx = Math.min(Math.max(xc(maxIdx), ML + 14), W - MR - 14);
      s.push('<text class="etq" x="' + rn(tx) + '" y="' + rn(Math.max(pa.lluvia.top + 8, yL(maxVal) - 4)) + '" text-anchor="middle">' + fmt(maxVal) + '</text>');
    }

    // temperaturas y suelo (líneas de 2px)
    s.push('<path d="' + trazo(datos.tmax, i0, i1, xc, yT) + '" fill="none" stroke="var(--series-tmax)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="l-tmax"/>');
    s.push('<path d="' + trazo(datos.tmin, i0, i1, xc, yT) + '" fill="none" stroke="var(--series-tmin)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="l-tmin"/>');
    s.push('<path d="' + trazo(datos.suelo, i0, i1, xc, yS) + '" fill="none" stroke="var(--series-soil)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>');
    // etiquetas directas (la mínima es de poco contraste en claro: se rotula)
    if (datos.tmax[i0] != null) s.push('<text class="etq" x="' + rn(xc(i0) + 2) + '" y="' + rn(yT(datos.tmax[i0]) - 7) + '">Máx</text>');
    if (datos.tmin[i0] != null) s.push('<text class="etq" x="' + rn(xc(i0) + 2) + '" y="' + rn(yT(datos.tmin[i0]) + 16) + '">Mín</text>');

    // eje X: una marca por semana y «hoy»
    for (i = i0; i <= i1; i++) {
      if ((i - hh) % 7 !== 0 || i === hh) continue;
      s.push('<line x1="' + rn(xc(i)) + '" x2="' + rn(xc(i)) + '" y1="' + pa.suelo.bot + '" y2="' + (pa.suelo.bot + 4) + '" stroke="var(--axis)"/>');
      s.push('<text x="' + rn(xc(i)) + '" y="' + (pa.suelo.bot + 17) + '" text-anchor="middle">' + fechaCorta(datos.fechas[i]) + '</text>');
    }
    s.push('<line x1="' + rn(xc(hh)) + '" x2="' + rn(xc(hh)) + '" y1="' + pa.lluvia.top + '" y2="' + pa.suelo.bot + '" stroke="var(--text-secondary)" stroke-width="1"/>');
    s.push('<text class="hoy-et" x="' + rn(xc(hh)) + '" y="' + (pa.suelo.bot + 17) + '" text-anchor="middle">hoy</text>');
    if (xFin - xPrev > 60) s.push('<text x="' + rn(xPrev + 6) + '" y="' + (pa.lluvia.top + 12) + '">Previsión →</text>');

    // cruz y puntos de lectura
    s.push('<g id="cruz" visibility="hidden" pointer-events="none"><line id="cz-l" y1="' + pa.lluvia.top + '" y2="' + pa.suelo.bot + '" stroke="var(--text-secondary)" stroke-width="1"/>' +
      '<circle id="cz-tx" r="4.5" fill="var(--series-tmax)" stroke="var(--surface-1)" stroke-width="2"/>' +
      '<circle id="cz-tn" r="4.5" fill="var(--series-tmin)" stroke="var(--surface-1)" stroke-width="2"/>' +
      '<circle id="cz-s" r="4.5" fill="var(--series-soil)" stroke="var(--surface-1)" stroke-width="2"/></g>');

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("height", H);
    svg.innerHTML = s.join("");
    if (selIdx != null && selIdx >= i0 && selIdx <= i1 && document.activeElement === svg) mostrarDia(selIdx);
  }

  function pintarLeyenda() {
    var l = $("leyenda"); vaciar(l);
    function li(k, txt) { l.appendChild(h("li", null, k, txt)); }
    function bar(op) { var k = h("span", { class: "k-bar" }); k.style.background = "var(--series-rain)"; k.style.opacity = op; return k; }
    function lin(c) { var k = h("span", { class: "k-lin" }); k.style.background = c; return k; }
    li(bar(1), "Lluvia observada"); li(bar(0.6), "Lluvia prevista");
    li(lin("var(--series-tmax)"), "Temperatura máxima"); li(lin("var(--series-tmin)"), "Temperatura mínima");
    li(lin("var(--series-soil)"), "Humedad del suelo");
    li(h("span", { class: "k-ban" }), "Ventana probable de " + paramsDe(especie).nombre.toLowerCase());
    li(h("span", { class: "k-ideal" }), "Tmáx ideal");
  }

  // ---------------------------------------------------------------- Lectura por día (cruz + tooltip)
  function mostrarDia(i) {
    if (!geo || !datos) return;
    selIdx = i;
    var g = geo, x = g.xc(i), svg = $("svg"), tip = $("tip");
    var cruz = svg.querySelector("#cruz"); if (!cruz) return;
    cruz.setAttribute("visibility", "visible");
    var l = svg.querySelector("#cz-l"); l.setAttribute("x1", x); l.setAttribute("x2", x);
    function punto(id, v, yf) {
      var c = svg.querySelector(id);
      if (v == null) c.setAttribute("visibility", "hidden");
      else { c.setAttribute("visibility", "visible"); c.setAttribute("cx", x); c.setAttribute("cy", yf(v)); }
    }
    punto("#cz-tx", datos.tmax[i], g.yT); punto("#cz-tn", datos.tmin[i], g.yT); punto("#cz-s", datos.suelo[i], g.yS);

    vaciar(tip);
    var tipo = i < datos.h ? "observado" : (i === datos.h ? "hoy" : "previsión" + (i > datos.h + 7 ? " (poco fiable)" : ""));
    tip.appendChild(h("div", { class: "t-fecha" }, diaSemana(datos.fechas[i]) + " " + fechaCorta(datos.fechas[i]) + " ", h("span", { text: "· " + tipo })));
    function fila(color, etiqueta, val) {
      var k = h("span", { class: "t-key" }); k.style.background = color;
      tip.appendChild(h("div", { class: "t-fila" }, k, h("span", { class: "t-lab", text: etiqueta }), h("span", { class: "t-val", text: val })));
    }
    fila("var(--series-rain)", "Lluvia", fmt(datos.lluvia[i]) + " mm");
    fila("var(--series-tmax)", "Máxima", fmt(datos.tmax[i]) + " °C");
    fila("var(--series-tmin)", "Mínima", fmt(datos.tmin[i]) + " °C");
    fila("var(--series-soil)", "Suelo", fmt(datos.suelo[i], 2) + " m³/m³");
    tip.hidden = false;
    var w = tip.offsetWidth, left = x + 14;
    if (left + w > g.W - 4) left = Math.max(4, x - w - 14);
    tip.style.left = left + "px"; tip.style.top = (g.pa.lluvia.top + 4) + "px";
    svg.setAttribute("aria-label", "Gráfico de lluvia, temperatura y suelo. " + diaSemana(datos.fechas[i]) + " " + fechaCorta(datos.fechas[i]) +
      ": lluvia " + fmt(datos.lluvia[i]) + " mm, máxima " + fmt(datos.tmax[i]) + " grados, mínima " + fmt(datos.tmin[i]) + " grados.");
  }
  function ocultarDia() {
    var svg = $("svg"), c = svg.querySelector("#cruz"); if (c) c.setAttribute("visibility", "hidden");
    $("tip").hidden = true; selIdx = null;
  }
  function indiceDesdePuntero(ev) {
    var r = $("svg").getBoundingClientRect(), x = (ev.clientX - r.left) * (geo.W / r.width);
    var i = Math.round((x - ML) / geo.slot - 0.5) + geo.i0;
    return Math.min(geo.i1, Math.max(geo.i0, i));
  }
  (function eventos() {
    var svg = $("svg");
    svg.addEventListener("pointermove", function (e) { if (geo && datos) mostrarDia(indiceDesdePuntero(e)); });
    svg.addEventListener("pointerdown", function (e) { if (geo && datos) mostrarDia(indiceDesdePuntero(e)); });
    svg.addEventListener("pointerleave", function () { if (document.activeElement !== svg) ocultarDia(); });
    svg.addEventListener("focus", function () { if (geo && datos) mostrarDia(selIdx == null ? datos.h : selIdx); });
    svg.addEventListener("blur", ocultarDia);
    svg.addEventListener("keydown", function (e) {
      if (!geo || !datos) return;
      var i = selIdx == null ? datos.h : selIdx;
      if (e.key === "ArrowRight") i++; else if (e.key === "ArrowLeft") i--;
      else if (e.key === "Home") i = geo.i0; else if (e.key === "End") i = geo.i1; else return;
      e.preventDefault(); mostrarDia(Math.min(geo.i1, Math.max(geo.i0, i)));
    });
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(dibujar, 120); });
  })();

  // ---------------------------------------------------------------- Tabla accesible
  function pintarTabla() {
    var t = $("tabla"); vaciar(t);
    if (!datos) return;
    var head = h("tr");
    ["Día", "Tipo", "Lluvia (mm)", "Máx (°C)", "Mín (°C)", "Suelo (m³/m³)"].forEach(function (c) { head.appendChild(h("th", { scope: "col", text: c })); });
    t.appendChild(h("thead", null, head));
    var body = h("tbody");
    for (var i = Math.max(0, datos.h - VISTA_ATRAS); i < datos.fechas.length; i++) {
      var tipo = i < datos.h ? "Observado" : (i === datos.h ? "Hoy" : "Previsión");
      var tr = h("tr", i === datos.h ? { class: "hoy" } : null);
      [diaSemana(datos.fechas[i]) + " " + fechaCorta(datos.fechas[i]), tipo, fmt(datos.lluvia[i]), fmt(datos.tmax[i]), fmt(datos.tmin[i]), fmt(datos.suelo[i], 2)]
        .forEach(function (c) { tr.appendChild(h("td", { text: c })); });
      body.appendChild(tr);
    }
    t.appendChild(body);
  }

  // ---------------------------------------------------------------- Ajustes
  function pintarAjustes() {
    var t = $("ajustes-tabla"); vaciar(t);
    var head = h("tr", null, h("th", { scope: "col", text: "Parámetro" }));
    M.ORDEN.forEach(function (id) { head.appendChild(h("th", { scope: "col", text: M.DEFECTO[id].nombre })); });
    t.appendChild(h("thead", null, head));
    var body = h("tbody");
    CAMPOS.forEach(function (c) {
      var tr = h("tr", null, h("td", { text: c[1] }));
      M.ORDEN.forEach(function (id) {
        var val = aPlano(paramsDe(id))[c[0]];
        var inp = h("input", { type: "text", inputmode: c[0] === "desde" || c[0] === "hasta" ? "text" : "decimal", value: String(val),
          "data-id": id, "data-k": c[0], "aria-label": c[1] + " — " + M.DEFECTO[id].nombre });
        tr.appendChild(h("td", null, inp));
      });
      body.appendChild(tr);
    });
    t.appendChild(body);
  }
  $("ajustes-tabla").addEventListener("change", function (e) {
    var inp = e.target, id = inp.getAttribute("data-id"), k = inp.getAttribute("data-k"); if (!id || !k) return;
    var pl = Object.assign(aPlano(paramsDe(id)), overrides[id] || {});
    var raw = inp.value.trim().replace(",", ".");
    pl[k] = k === "desde" || k === "hasta" ? raw : Number(raw);
    var err = raw === "" ? "Falta un valor." : validarPlano(pl);
    var el = $("ajuste-error");
    if (err) { el.textContent = err; el.hidden = false; inp.value = String(aPlano(paramsDe(id))[k]); return; }
    el.hidden = true;
    overrides[id] = pl; lsSet(KP, JSON.stringify(overrides));
    pintarTarjetas(); dibujar(); pintarLeyenda();
  });
  $("b-reset").addEventListener("click", function () {
    overrides = {}; try { localStorage.removeItem(KP); } catch (e) { /* nada */ }
    $("ajuste-error").hidden = true; pintarAjustes(); pintarTarjetas(); dibujar(); pintarLeyenda();
  });

  // ---------------------------------------------------------------- Zonas: formulario
  var formZ = $("form-zona");
  function errZona(m) { var e = $("z-error"); e.hidden = !m; e.textContent = m || ""; }
  $("b-nueva").addEventListener("click", function () { formZ.hidden = !formZ.hidden; errZona(""); if (!formZ.hidden) $("z-nombre").focus(); });
  $("b-cancelar-zona").addEventListener("click", function () { formZ.hidden = true; });
  $("b-centro").addEventListener("click", function () {
    var v = lsJson(KV, null);
    if (!v || !isFinite(v.lat) || !isFinite(v.lng)) { errZona("Aún no hay una vista guardada del mapa. Abre el mapa, muévelo y vuelve."); return; }
    errZona(""); $("z-lat").value = r2(v.lat); $("z-lng").value = r2(v.lng);
  });
  formZ.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("z-nombre").value.trim().slice(0, 60);
    var lat = Number($("z-lat").value.replace(",", ".")), lng = Number($("z-lng").value.replace(",", "."));
    if (!nombre) return errZona("Pon un nombre a la zona.");
    if (!isFinite(lat) || Math.abs(lat) > 90) return errZona("La latitud debe estar entre −90 y 90.");
    if (!isFinite(lng) || Math.abs(lng) > 180) return errZona("La longitud debe estar entre −180 y 180.");
    var z = { id: "z" + Date.now().toString(36), nombre: nombre, lat: r2(lat), lng: r2(lng) };
    zonas.push(z); zonaId = z.id; guardarZonas(); formZ.hidden = true; formZ.reset(); errZona("");
    pintarSelectorZona(); cargar(false);
  });
  $("zona").addEventListener("change", function (e) { zonaId = e.target.value; guardarZonas(); cargar(false); });
  $("b-actualizar").addEventListener("click", function () { cargar(true); });
  (function botonBorrar() {
    var b = h("button", { type: "button", class: "btn", id: "b-borrar-zona", text: "Borrar zona" });
    b.addEventListener("click", function () {
      var z = zonaActual();
      if (zonas.length < 2 || !confirm("¿Borrar la zona «" + z.nombre + "»?")) return;
      zonas = zonas.filter(function (x) { return x.id !== z.id; }); zonaId = zonas[0].id; guardarZonas();
      pintarSelectorZona(); cargar(false);
    });
    $("b-nueva").insertAdjacentElement("afterend", b);
  })();

  // ---------------------------------------------------------------- Arranque
  function pintarTodo() {
    pintarEstadoDatos(); pintarTiles(); pintarTarjetas(); pintarLeyenda(); dibujar(); pintarTabla();
  }
  cargarZonas(); pintarSelectorZona(); pintarAjustes(); pintarLeyenda(); cargar(false);
  window.__lluvia = { datos: function () { return datos; }, especie: function () { return especie; } };   // útil para depurar
})();
