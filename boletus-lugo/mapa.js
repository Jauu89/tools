(function () {
  "use strict";

  // ---------------------------------------------------------------- Ajustes
  var KEY = "boletus-lugo:puntos:v1";
  var VKEY = "boletus-lugo:vista:v1";
  var XKEY = "boletus-lugo:export:v1";
  var CENTRO = [43.02, -7.38];          // entre O Corgo y Castroverde (aprox.)
  var ZOOM = 11;
  var RESULTADOS = [["nada", "Nada"], ["poco", "Poco"], ["bastante", "Bastante"], ["mucho", "Mucho"]];
  var RES_TXT = { nada: "Nada", poco: "Poco", bastante: "Bastante", mucho: "Mucho" };
  var ARBOLES = ["Castaño", "Roble", "Pino", "Haya", "Eucalipto", "Mixto", "Otro"];

  var SPECIES = window.SPECIES || [];
  var spById = {};
  SPECIES.forEach(function (s) { spById[s.id] = s; });

  // ---------------------------------------------------------------- Utilidades
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function hoy() {
    var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function nuevoId() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fechaBonita(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }
  function str(v, max) { return typeof v === "string" ? v.slice(0, max) : ""; }

  // Limpia y valida un punto (también el que llega de un archivo importado).
  function limpiar(p) {
    if (!p || typeof p !== "object") return null;
    var lat = Number(p.lat), lng = Number(p.lng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    var visitas = (Array.isArray(p.visitas) ? p.visitas : []).map(function (v) {
      if (!v || typeof v !== "object") return null;
      var fecha = /^\d{4}-\d{2}-\d{2}$/.test(v.fecha) ? v.fecha : "";
      var res = RES_TXT[v.res] ? v.res : "nada";
      return { id: str(v.id, 40) || nuevoId(), fecha: fecha, res: res, nota: str(v.nota, 1000) };
    }).filter(Boolean).slice(0, 500);
    return {
      id: str(p.id, 40) || nuevoId(),
      nombre: str(p.nombre, 80) || "Punto sin nombre",
      lat: lat, lng: lng,
      especies: (Array.isArray(p.especies) ? p.especies : []).filter(function (id) { return spById[id]; }),
      arbol: str(p.arbol, 60),
      notas: str(p.notas, 4000),
      creado: str(p.creado, 30) || new Date().toISOString(),
      visitas: visitas
    };
  }

  // ---------------------------------------------------------------- Datos
  var puntos = [];
  var guardadoOk = true;

  function cargar() {
    var raw = lsGet(KEY), arr = [];
    if (raw) { try { arr = JSON.parse(raw); } catch (e) { arr = []; } }
    puntos = (Array.isArray(arr) ? arr : []).map(limpiar).filter(Boolean);
  }
  function guardar() {
    guardadoOk = lsSet(KEY, JSON.stringify(puntos));
    $("aviso-guardado").hidden = guardadoOk;
    return guardadoOk;
  }
  function porId(id) { return puntos.filter(function (p) { return p.id === id; })[0]; }

  function ultimaVisita(p) {
    var v = p.visitas.slice().sort(function (a, b) { return (a.fecha || "").localeCompare(b.fecha || ""); });
    return v.length ? v[v.length - 1] : null;
  }
  function estado(p) { var v = ultimaVisita(p); return v ? v.res : "sin"; }

  // ---------------------------------------------------------------- Mapa
  var map = L.map("map", { zoomControl: true });
  var vista = null;
  try { vista = JSON.parse(lsGet(VKEY)); } catch (e) { vista = null; }
  if (vista && isFinite(vista.lat) && isFinite(vista.lng) && isFinite(vista.z)) map.setView([vista.lat, vista.lng], vista.z);
  else map.setView(CENTRO, ZOOM);

  var base = {
    "Mapa": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "© OpenStreetMap" }),
    "Topográfico": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      { maxZoom: 17, subdomains: "abc", attribution: "© OpenStreetMap, SRTM · © OpenTopoMap (CC-BY-SA)" }),
    "Satélite (PNOA)": L.tileLayer("https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&version=1.0.0" +
      "&layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}&Format=image/jpeg",
      { maxZoom: 19, attribution: "© IGN España (CC BY 4.0)" })
  };
  var capaGuardada = lsGet("boletus-lugo:capa:v1");
  (base[capaGuardada] || base["Mapa"]).addTo(map);
  L.control.layers(base, null, { collapsed: true }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.on("baselayerchange", function (e) { lsSet("boletus-lugo:capa:v1", e.name); });
  map.on("moveend", function () {
    var c = map.getCenter();
    lsSet(VKEY, JSON.stringify({ lat: c.lat, lng: c.lng, z: map.getZoom() }));
  });

  var marcadores = {};
  var seleccionado = null;

  function icono(p, sel) {
    return L.divIcon({ className: "pin pin-" + estado(p) + (sel ? " sel" : ""), html: "<span></span>",
      iconSize: [26, 26], iconAnchor: [13, 26] });
  }
  function ponerMarcador(p) {
    if (marcadores[p.id]) map.removeLayer(marcadores[p.id]);
    var m = L.marker([p.lat, p.lng], { icon: icono(p, p.id === seleccionado), title: p.nombre, keyboard: true, riseOnHover: true });
    m.on("click", function () { seleccionar(p.id, false); });
    m.on("dragend", function () {
      var ll = m.getLatLng(), pt = porId(p.id);
      if (!pt) return;
      pt.lat = ll.lat; pt.lng = ll.lng; guardar(); vistaDetalle(pt.id, true);
    });
    m.addTo(map);
    marcadores[p.id] = m;
  }
  function quitarMarcador(id) {
    if (marcadores[id]) { map.removeLayer(marcadores[id]); delete marcadores[id]; }
  }
  function refrescarMarcador(p) {
    var m = marcadores[p.id];
    if (!m) return ponerMarcador(p);
    m.setIcon(icono(p, p.id === seleccionado));
    m.options.title = p.nombre;
    var el = m.getElement(); if (el) el.title = p.nombre;
  }
  function dibujarTodos() {
    Object.keys(marcadores).forEach(quitarMarcador);
    puntos.forEach(ponerMarcador);
  }

  // ---------------------------------------------------------------- Selección
  function seleccionar(id, centrar) {
    var anterior = seleccionado;
    seleccionado = id;
    if (anterior && marcadores[anterior]) { marcadores[anterior].dragging && marcadores[anterior].dragging.disable(); refrescarMarcador(porId(anterior) || { id: anterior, visitas: [] }); }
    var p = porId(id);
    if (!p) { seleccionado = null; return vistaLista(); }
    refrescarMarcador(p);
    if (marcadores[id].dragging) marcadores[id].dragging.enable();
    if (centrar) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15));
    vistaDetalle(id);
  }
  function deseleccionar() {
    var ant = seleccionado; seleccionado = null;
    if (ant && marcadores[ant]) { marcadores[ant].dragging.disable(); var p = porId(ant); if (p) refrescarMarcador(p); }
  }

  // ---------------------------------------------------------------- Panel: lista
  var panel = $("panel");
  var filtro = { q: "", esp: "" };

  function coincide(p) {
    if (filtro.esp && p.especies.indexOf(filtro.esp) < 0) return false;
    if (!filtro.q) return true;
    var q = filtro.q.toLowerCase();
    var txt = [p.nombre, p.notas, p.arbol].concat(p.especies.map(function (id) { return spById[id].es + " " + spById[id].sci; })).join(" ").toLowerCase();
    return txt.indexOf(q) >= 0;
  }

  function filasHTML() {
    var lista = puntos.filter(coincide).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
    if (!puntos.length) return '<p class="vacio">Aún no tienes puntos. Pulsa «＋ Añadir punto» y toca el mapa, o usa «📍 Mi ubicación».</p>';
    if (!lista.length) return '<p class="vacio">Ningún punto coincide con el filtro.</p>';
    return '<ul class="lista">' + lista.map(function (p) {
      var v = ultimaVisita(p);
      var esp = p.especies.map(function (id) { return spById[id].es; }).join(", ");
      return '<li><button type="button" class="fila" data-id="' + esc(p.id) + '">' +
        '<span class="mini-pin pin-' + estado(p) + '"></span><span><strong>' + esc(p.nombre) + "</strong>" +
        (esp ? "<small>" + esc(esp) + "</small>" : "") +
        "<small>" + (v ? "Última visita " + fechaBonita(v.fecha) + ": " + RES_TXT[v.res].toLowerCase() : "Sin visitas") + "</small></span></button></li>";
    }).join("") + "</ul>";
  }

  function vistaLista() {
    deseleccionar();
    var opts = '<option value="">Todas las especies</option>' + SPECIES.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (filtro.esp === s.id ? " selected" : "") + ">" + esc(s.es) + "</option>";
    }).join("");
    var ult = lsGet(XKEY);
    panel.innerHTML =
      "<h2>Mis puntos <small>(" + puntos.length + ")</small></h2>" +
      '<div class="filtros"><input type="search" id="q" placeholder="Buscar por nombre, nota, árbol…" value="' + esc(filtro.q) + '" aria-label="Buscar">' +
      '<select id="fe" aria-label="Filtrar por especie">' + opts + "</select></div>" +
      '<div id="filas">' + filasHTML() + "</div>" +
      '<div class="pie-panel">' +
      "<p><strong>Copia de seguridad.</strong> Tus puntos viven solo en este navegador. Si borras los datos del navegador, se pierden.</p>" +
      '<div class="acciones"><button type="button" class="btn" id="b-exportar">Exportar</button>' +
      '<button type="button" class="btn" id="b-importar">Importar</button></div>' +
      "<p>" + (ult ? "Última copia: " + esc(fechaBonita(ult)) : "Todavía no has hecho ninguna copia.") + "</p>" +
      "<p>Guarda el archivo exportado fuera del repositorio. El repositorio es público.</p></div>";
  }

  panel.addEventListener("input", function (e) {
    if (e.target.id === "q") { filtro.q = e.target.value; $("filas").innerHTML = filasHTML(); }
  });
  panel.addEventListener("change", function (e) {
    if (e.target.id === "fe") { filtro.esp = e.target.value; $("filas").innerHTML = filasHTML(); }
  });

  // ---------------------------------------------------------------- Panel: detalle
  var temporizador;
  function marcarGuardado(txt) {
    var el = $("estado"); if (!el) return;
    el.textContent = txt;
  }
  function guardarCambios(p) {
    clearTimeout(temporizador);
    marcarGuardado("Guardando…");
    temporizador = setTimeout(function () {
      var ok = guardar();
      marcarGuardado(ok ? "Guardado" : "No se pudo guardar en este navegador");
      refrescarMarcador(p);
    }, 300);
  }

  function vistaDetalle(id, soloCoords) {
    var p = porId(id);
    if (!p) return vistaLista();
    if (soloCoords && $("coords")) { $("coords").textContent = p.lat.toFixed(6) + ", " + p.lng.toFixed(6); return; }

    var esp = SPECIES.map(function (s) {
      return '<label><input type="checkbox" name="esp" value="' + esc(s.id) + '"' + (p.especies.indexOf(s.id) >= 0 ? " checked" : "") + "> " + esc(s.es) + "</label>";
    }).join("");
    var arb = '<option value="">—</option>' + ARBOLES.map(function (a) {
      return '<option' + (p.arbol === a ? " selected" : "") + ">" + esc(a) + "</option>";
    }).join("") + (p.arbol && ARBOLES.indexOf(p.arbol) < 0 ? '<option selected>' + esc(p.arbol) + "</option>" : "");

    panel.innerHTML =
      '<button type="button" class="btn mini" id="b-lista">← Mis puntos</button>' +
      '<label class="campo"><span>Nombre</span><input type="text" id="d-nombre" maxlength="80" value="' + esc(p.nombre) + '"></label>' +
      '<p class="coords">Coordenadas: <span id="coords">' + p.lat.toFixed(6) + ", " + p.lng.toFixed(6) + "</span> " +
      '<button type="button" class="btn mini" id="b-copiar">Copiar</button></p>' +
      '<p class="estado">Para moverlo, arrastra el marcador en el mapa.</p>' +
      '<div class="campo"><span>Especies que has encontrado aquí</span><div class="especies">' + esp + "</div></div>" +
      '<label class="campo"><span>Árbol</span><select id="d-arbol">' + arb + "</select></label>" +
      '<label class="campo"><span>Notas</span><textarea id="d-notas" maxlength="4000" placeholder="Acceso, orientación, qué había alrededor…">' + esc(p.notas) + "</textarea></label>" +
      '<p class="estado" id="estado"></p>' +
      "<h3>Visitas</h3>" + visitasHTML(p) +
      '<div class="nueva-visita"><div class="dos">' +
      '<label class="campo"><span>Fecha</span><input type="date" id="v-fecha" value="' + hoy() + '"></label>' +
      '<label class="campo"><span>Resultado</span><select id="v-res">' + RESULTADOS.map(function (r) {
        return '<option value="' + r[0] + '">' + r[1] + "</option>"; }).join("") + "</select></label></div>" +
      '<label class="campo"><span>Nota</span><input type="text" id="v-nota" maxlength="1000" placeholder="Opcional: cantidad, tamaño, tiempo que hacía…"></label>' +
      '<button type="button" class="btn primario" id="b-visita">Añadir visita</button></div>' +
      '<div class="acciones"><button type="button" class="btn peligro" id="b-borrar">Borrar punto</button></div>';
  }

  function visitasHTML(p) {
    var v = p.visitas.slice().sort(function (a, b) { return (b.fecha || "").localeCompare(a.fecha || ""); });
    if (!v.length) return '<p class="estado" id="sin-visitas">Todavía no has anotado ninguna visita.</p>';
    return '<ul class="visitas">' + v.map(function (x) {
      return "<li><span><strong>" + esc(fechaBonita(x.fecha) || "Sin fecha") + "</strong> · " + esc(RES_TXT[x.res]) + "</span>" +
        '<button type="button" class="x" data-vid="' + esc(x.id) + '" aria-label="Borrar visita">✕</button>' +
        (x.nota ? '<p class="nota">' + esc(x.nota) + "</p>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  panel.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    if (t.classList.contains("fila")) return seleccionar(t.getAttribute("data-id"), true);
    var p = seleccionado ? porId(seleccionado) : null;
    switch (t.id) {
      case "b-lista": return vistaLista();
      case "b-exportar": return exportar();
      case "b-importar": return $("f-importar").click();
      case "b-copiar":
        if (p && navigator.clipboard) navigator.clipboard.writeText(p.lat.toFixed(6) + ", " + p.lng.toFixed(6)).then(function () { t.textContent = "Copiado"; });
        return;
      case "b-visita":
        if (!p) return;
        p.visitas.push({ id: nuevoId(), fecha: $("v-fecha").value || hoy(), res: $("v-res").value, nota: $("v-nota").value.slice(0, 1000) });
        guardar(); refrescarMarcador(p); vistaDetalle(p.id); return;
      case "b-borrar":
        if (p && confirm("¿Borrar «" + p.nombre + "» y todas sus visitas? No se puede deshacer.")) {
          quitarMarcador(p.id); puntos = puntos.filter(function (x) { return x.id !== p.id; });
          seleccionado = null; guardar(); vistaLista();
        }
        return;
    }
    if (t.classList.contains("x") && p) {
      var vid = t.getAttribute("data-vid");
      p.visitas = p.visitas.filter(function (v) { return v.id !== vid; });
      guardar(); refrescarMarcador(p); vistaDetalle(p.id);
    }
  });

  panel.addEventListener("input", function (e) {
    var p = seleccionado ? porId(seleccionado) : null; if (!p) return;
    if (e.target.id === "d-nombre") { p.nombre = e.target.value.slice(0, 80) || "Punto sin nombre"; guardarCambios(p); }
    else if (e.target.id === "d-notas") { p.notas = e.target.value.slice(0, 4000); guardarCambios(p); }
  });
  panel.addEventListener("change", function (e) {
    var p = seleccionado ? porId(seleccionado) : null; if (!p) return;
    if (e.target.id === "d-arbol") { p.arbol = e.target.value; guardarCambios(p); }
    else if (e.target.name === "esp") {
      p.especies = [].slice.call(panel.querySelectorAll('input[name="esp"]:checked')).map(function (c) { return c.value; });
      guardarCambios(p);
    }
  });

  // ---------------------------------------------------------------- Añadir puntos
  var anadiendo = false;
  function modoAnadir(on) {
    anadiendo = on;
    $("b-anadir").classList.toggle("activo", on);
    $("pista").hidden = !on;
    document.querySelector(".mapa-caja").classList.toggle("anadiendo", on);
  }
  function crearPunto(lat, lng, nombre) {
    var p = limpiar({ nombre: nombre || "Punto nuevo", lat: lat, lng: lng, creado: new Date().toISOString() });
    puntos.push(p); guardar(); ponerMarcador(p);
    seleccionar(p.id, false);
    var n = $("d-nombre"); if (n) { n.focus(); n.select(); }
    return p;
  }
  $("b-anadir").addEventListener("click", function () { modoAnadir(!anadiendo); });
  $("b-cancelar").addEventListener("click", function () { modoAnadir(false); });
  map.on("click", function (e) {
    if (!anadiendo) return;
    modoAnadir(false);
    crearPunto(e.latlng.lat, e.latlng.lng);
  });
  map.on("contextmenu", function (e) { crearPunto(e.latlng.lat, e.latlng.lng); });   // clic derecho

  $("b-aqui").addEventListener("click", function () {
    var b = $("b-aqui");
    if (!navigator.geolocation) { alert("Este navegador no ofrece geolocalización."); return; }
    b.textContent = "Buscando…"; b.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      b.textContent = "📍 Mi ubicación"; b.disabled = false;
      map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      if (confirm("¿Añadir un punto aquí? (precisión aprox. " + Math.round(pos.coords.accuracy) + " m)")) {
        crearPunto(pos.coords.latitude, pos.coords.longitude);
      }
    }, function (err) {
      b.textContent = "📍 Mi ubicación"; b.disabled = false;
      alert("No pude obtener tu ubicación (" + (err && err.message ? err.message : "sin permiso") + ").");
    }, { enableHighAccuracy: true, timeout: 15000 });
  });

  $("b-todos").addEventListener("click", function () {
    if (!puntos.length) return;
    map.fitBounds(L.latLngBounds(puntos.map(function (p) { return [p.lat, p.lng]; })).pad(0.2), { maxZoom: 16 });
  });

  // ---------------------------------------------------------------- Exportar / importar
  function exportar() {
    var datos = { app: "boletus-lugo", version: 1, exportado: new Date().toISOString(), puntos: puntos };
    var blob = new Blob([JSON.stringify(datos, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "boletus-puntos-" + hoy() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    lsSet(XKEY, hoy());
    if (!seleccionado) vistaLista();
  }

  $("f-importar").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("El archivo es demasiado grande."); return; }
    var r = new FileReader();
    r.onload = function () {
      var datos;
      try { datos = JSON.parse(r.result); } catch (err) { alert("El archivo no es un JSON válido."); return; }
      var arr = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.puntos) ? datos.puntos : null);
      if (!arr) { alert("No encuentro puntos en ese archivo."); return; }
      var nuevos = arr.slice(0, 5000).map(limpiar).filter(Boolean);
      if (!nuevos.length) { alert("No había ningún punto válido."); return; }
      if (!confirm("Importar " + nuevos.length + " puntos? Los que tengan el mismo identificador se sobrescriben; los demás se añaden.")) return;
      nuevos.forEach(function (n) {
        var i = puntos.findIndex(function (p) { return p.id === n.id; });
        if (i >= 0) puntos[i] = n; else puntos.push(n);
      });
      guardar(); dibujarTodos(); seleccionado = null; vistaLista();
      $("b-todos").click();
    };
    r.readAsText(f);
  });

  // ---------------------------------------------------------------- Arranque
  cargar();
  dibujarTodos();
  vistaLista();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
  window.__boletus = { map: map, puntos: function () { return puntos; } };   // útil para depurar
})();
