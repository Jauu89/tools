/* Modelo de fructificación de boletus a partir de lluvia y temperatura.
 *
 * Se usa en el navegador (window.Modelo) y en Node (require), así el mismo código
 * servirá luego para las alarmas de Telegram.
 *
 * IMPORTANTE: los umbrales son un PUNTO DE PARTIDA, sacados de un vídeo divulgativo y de
 * fuentes generales. No están validados para Lugo. Se afinan con el diario de visitas.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Modelo = factory();
})(this, function () {
  "use strict";

  // ------------------------------------------------------------ Parámetros por defecto
  // lluviaMm   : litros/m² acumulados en `dias` días que disparan una brotada
  // minDiasLluvia: días con ≥1 mm dentro de esa ventana (lluvia "repartida", no un chaparrón)
  // retraso    : [mín, máx] de días desde la lluvia hasta que salen las setas
  // tmax       : rango ideal de temperatura máxima diaria (°C)
  // tminMin    : temperatura mínima nocturna por encima de la cual va bien (°C)
  // temporada  : [mes, día] de inicio y fin
  var DEFECTO = {
    edulis: {
      nombre: "Boleto comestible", sci: "Boletus edulis",
      lluviaMm: 30, dias: 7, minDiasLluvia: 2, retraso: [10, 16], tmax: [10, 20], tminMin: 7,
      desde: [8, 20], hasta: [12, 10]
    },
    aereus: {
      nombre: "Boleto bronceado", sci: "Boletus aereus",
      lluviaMm: 20, dias: 7, minDiasLluvia: 2, retraso: [10, 16], tmax: [15, 25], tminMin: 7,
      desde: [5, 20], hasta: [10, 10]
    },
    pinophilus: {
      nombre: "Boleto de los pinos", sci: "Boletus pinophilus",
      lluviaMm: 25, dias: 7, minDiasLluvia: 2, retraso: [10, 16], tmax: [15, 25], tminMin: 7,
      desde: [5, 20], hasta: [11, 30]
    },
    reticulatus: {
      nombre: "Boleto de verano", sci: "Boletus reticulatus",
      lluviaMm: 15, dias: 7, minDiasLluvia: 2, retraso: [8, 14], tmax: [15, 25], tminMin: 7,
      desde: [6, 1], hasta: [9, 30]
    }
  };
  var ORDEN = ["edulis", "aereus", "pinophilus", "reticulatus"];
  var NIVELES = ["nada", "adverso", "posible", "probable", "alta"];   // de peor a mejor

  // Tolerancias: fuera del rango ideal pero aún a medias
  var TOL = { tmaxBajo: 3, tmaxAlto: 4, tmaxAltoMalo: 8, tminBajo: 3 };

  // ------------------------------------------------------------ Utilidades de fechas
  function sumarDias(iso, n) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
  }
  function enTemporada(iso, p) {
    var m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10)), v = m * 100 + d;
    return v >= p.desde[0] * 100 + p.desde[1] && v <= p.hasta[0] * 100 + p.hasta[1];
  }
  // Fecha de un índice, aunque caiga más allá de los datos
  function fechaDe(datos, i) {
    if (i >= 0 && i < datos.fechas.length) return datos.fechas[i];
    return i < 0 ? sumarDias(datos.fechas[0], i) : sumarDias(datos.fechas[datos.fechas.length - 1], i - (datos.fechas.length - 1));
  }
  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }

  // ------------------------------------------------------------ Puntuación de temperatura
  // 1 = día ideal, 0,5 = tolerable, 0 = malo (helada o calor excesivo)
  function puntuarDia(tmax, tmin, p) {
    var tx = num(tmax), tn = num(tmin);
    if (tx === null || tn === null) return null;
    if (tn <= 0) return 0;                                           // helada
    if (tx > p.tmax[1] + TOL.tmaxAltoMalo) return 0;                 // calor excesivo
    var xOk = tx >= p.tmax[0] && tx <= p.tmax[1] + TOL.tmaxAlto;
    var xMid = tx >= p.tmax[0] - TOL.tmaxBajo && tx <= p.tmax[1] + TOL.tmaxAltoMalo;
    var nOk = tn >= p.tminMin;
    var nMid = tn >= p.tminMin - TOL.tminBajo;
    if (xOk && nOk) return 1;
    if (xMid && nMid) return 0.5;
    return 0;
  }

  // ------------------------------------------------------------ Episodios de lluvia
  // Devuelve ventanas de fructificación probables para una especie.
  // datos: { fechas[], lluvia[], tmax[], tmin[] }   h: índice de "hoy"
  function evaluar(datos, params, h) {
    var p = params, W = p.dias, n = datos.fechas.length, L = datos.lluvia.map(function (v) { return num(v) || 0; });
    var cond = [], acum = [], i, j;
    for (i = 0; i < n; i++) {
      var s = 0, d = 0;                                              // al principio la ventana es parcial
      for (j = Math.max(0, i - W + 1); j <= i; j++) { s += L[j]; if (L[j] >= 1) d++; }
      acum.push(s); cond.push(s >= p.lluviaMm && d >= p.minDiasLluvia);
    }

    // Tramos consecutivos en que se cumple la condición
    var runs = [];
    for (i = 0; i < n; i++) {
      if (!cond[i]) continue;
      var a = i; while (i + 1 < n && cond[i + 1]) i++;
      runs.push([a, i]);
    }

    var eventos = runs.map(function (r) {
      var a = r[0], b = r[1], ult = a, mm = 0, ini = a;
      for (j = a; j <= b; j++) { if (L[j] >= 3) ult = j; if (acum[j] > mm) mm = acum[j]; }
      for (j = Math.max(0, a - W + 1); j <= a; j++) { if (L[j] >= 1) { ini = j; break; } }
      return { disparo: a, ult: ult, mm: Math.round(mm * 10) / 10, lluviaDesde: ini, lluviaHasta: ult,
               desde: a + p.retraso[0], hasta: ult + p.retraso[1] };
    });

    // Une ventanas que se solapan o se tocan
    eventos.sort(function (x, y) { return x.desde - y.desde; });
    var ventanas = [];
    eventos.forEach(function (e) {
      var u = ventanas[ventanas.length - 1];
      if (u && e.desde <= u.hasta + 1) {
        u.hasta = Math.max(u.hasta, e.hasta); u.lluviaHasta = Math.max(u.lluviaHasta, e.lluviaHasta);
        u.disparo = Math.min(u.disparo, e.disparo); u.mm = Math.max(u.mm, e.mm);
      } else ventanas.push({ disparo: e.disparo, lluviaDesde: e.lluviaDesde, lluviaHasta: e.lluviaHasta,
                             mm: e.mm, desde: e.desde, hasta: e.hasta });
    });

    // Valora cada ventana
    var out = [];
    ventanas.forEach(function (v) {
      if (v.hasta < h - 5) return;                                   // ya pasó hace tiempo
      var suma = 0, conocidos = 0, helada = 0, calor = 0, frio = 0, k;
      for (k = v.desde; k <= v.hasta; k++) {
        if (k < 0 || k >= n) continue;
        var sc = puntuarDia(datos.tmax[k], datos.tmin[k], p);
        if (sc === null) continue;
        suma += sc; conocidos++;
        if (num(datos.tmin[k]) !== null && datos.tmin[k] <= 0) helada++;
        if (num(datos.tmax[k]) !== null && datos.tmax[k] > p.tmax[1] + TOL.tmaxAlto) calor++;
        if (num(datos.tmin[k]) !== null && datos.tmin[k] < p.tminMin) frio++;
      }
      var puntos = conocidos ? suma / conocidos : null;
      var fechaMedia = fechaDe(datos, Math.round((v.desde + v.hasta) / 2));
      var temporadaOk = enTemporada(fechaMedia, p);
      var prevista = v.disparo > h;                                  // la lluvia que la dispara aún no ha caído
      var extendida = !prevista && v.lluviaHasta > h;                // disparada ya, pero la previsión alarga la ventana
      var nivel;
      if (!temporadaOk) nivel = "nada";
      else if (puntos === null) nivel = "probable";                  // aún sin previsión de temperatura
      else if (puntos >= 0.75) nivel = "alta";
      else if (puntos >= 0.5) nivel = "probable";
      else if (puntos >= 0.25) nivel = "posible";
      else nivel = "adverso";
      if (prevista && nivel === "alta") nivel = "probable";           // la previsión no da para tanta confianza

      var estado = v.desde <= h && h <= v.hasta ? "encurso" : (v.desde > h ? "proxima" : "reciente");
      out.push({
        desde: v.desde, hasta: v.hasta,
        fechaDesde: fechaDe(datos, v.desde), fechaHasta: fechaDe(datos, v.hasta),
        lluviaDesde: fechaDe(datos, v.lluviaDesde), lluviaHasta: fechaDe(datos, v.lluviaHasta),
        mm: v.mm, nivel: nivel, estado: estado, prevista: prevista, extendida: extendida,
        puntosTemp: puntos === null ? null : Math.round(puntos * 100) / 100,
        diasConocidos: conocidos, helada: helada, calor: calor, frio: frio, enTemporada: temporadaOk
      });
    });
    return out;
  }

  // ------------------------------------------------------------ Resumen para la tarjeta de una especie
  function resumen(datos, params, h) {
    var ventanas = evaluar(datos, params, h);
    var utiles = ventanas.filter(function (v) { return v.nivel !== "nada"; });
    var rank = { encurso: 0, proxima: 1, reciente: 2 };
    utiles.sort(function (a, b) {
      return rank[a.estado] - rank[b.estado] || a.desde - b.desde;
    });
    var W = params.dias, l = datos.lluvia.map(function (v) { return num(v) || 0; });
    var ult7 = 0, i;
    for (i = Math.max(0, h - W + 1); i <= h; i++) ult7 += l[i];
    return {
      ventanas: ventanas, principal: utiles[0] || null,
      lluviaUltimosDias: Math.round(ult7 * 10) / 10,
      enTemporadaHoy: enTemporada(datos.fechas[h], params)
    };
  }

  function lluviaEntre(datos, desde, hasta) {
    var s = 0;
    for (var i = Math.max(0, desde); i <= Math.min(datos.lluvia.length - 1, hasta); i++) s += num(datos.lluvia[i]) || 0;
    return Math.round(s * 10) / 10;
  }

  return {
    DEFECTO: DEFECTO, ORDEN: ORDEN, NIVELES: NIVELES,
    evaluar: evaluar, resumen: resumen, puntuarDia: puntuarDia,
    sumarDias: sumarDias, enTemporada: enTemporada, fechaDe: fechaDe, lluviaEntre: lluviaEntre
  };
});
