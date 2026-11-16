(function () {
  "use strict";

  var GROUPS = window.GROUPS, SPECIES = window.SPECIES, PARES = window.PARES, CREDITS = window.CREDITS || {};
  var byId = {}, groupOf = {};
  SPECIES.forEach(function (s) { byId[s.id] = s; });
  GROUPS.forEach(function (g) { groupOf[g.id] = g; });

  // Cruza los pares: cada especie recibe a sus confundibles, en las dos direcciones.
  var conf = {};
  Object.keys(PARES).forEach(function (k) {
    var p = k.split("|");
    (conf[p[0]] = conf[p[0]] || []).push({ id: p[1], txt: PARES[k] });
    (conf[p[1]] = conf[p[1]] || []).push({ id: p[0], txt: PARES[k] });
  });

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function name(s) { return esc(s.es); }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var filter = "todas";

  // ---------- Filtros ----------
  var filtersEl = document.getElementById("filters");
  function renderFilters() {
    var chips = [{ id: "todas", label: "Todas", tone: "all" }].concat(GROUPS);
    filtersEl.innerHTML = chips.map(function (g) {
      var on = g.id === filter;
      return '<button type="button" class="chip tone-' + g.tone + (on ? " on" : "") +
        '" data-f="' + g.id + '" aria-pressed="' + on + '">' + esc(g.label) + "</button>";
    }).join("");
  }
  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-f]");
    if (!b) return;
    filter = b.getAttribute("data-f");
    renderFilters(); renderGallery();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  // ---------- Galería ----------
  var galleryEl = document.getElementById("gallery");

  function cardHTML(s) {
    var g = groupOf[s.group];
    var main = s.imgs[0];
    var thumbs = s.imgs.length > 1 ? '<div class="thumbs">' + s.imgs.map(function (im, i) {
      return '<button type="button" class="thumb' + (i === 0 ? " on" : "") + '" data-i="' + i +
        '" aria-label="Foto ' + (i + 1) + " de " + s.imgs.length + '"><img src="img/' + im.f + '" alt="" loading="lazy"></button>';
    }).join("") + "</div>" : "";

    var rasgos = s.rasgos.map(function (r) {
      return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
    }).join("");

    var confs = (conf[s.id] || []).map(function (c) {
      var o = byId[c.id], og = groupOf[o.group];
      return '<li><button type="button" class="ir tone-' + og.tone + '" data-go="' + o.id + '">' +
        '<span class="dot"></span>' + name(o) + " <em>(" + esc(o.sci) + ")</em> →</button>" +
        '<span class="tag tone-' + og.tone + '">' + esc(og.label) + "</span>" +
        "<p>" + esc(c.txt) + "</p></li>";
    }).join("");

    return '<article class="card tone-' + g.tone + '" id="sp-' + s.id + '" data-id="' + s.id + '">' +
      '<figure class="foto"><img src="img/' + main.f + '" alt="' + esc(s.es + " (" + s.sci + ")") + '" loading="lazy">' +
      "<figcaption>" + esc(main.cap) + "</figcaption></figure>" + thumbs +
      '<div class="cuerpo"><span class="etiqueta tone-' + g.tone + '">' + esc(g.label) + "</span>" +
      "<h3>" + name(s) + "</h3><p class=\"sci\">" + esc(s.sci) + "</p>" +
      "<dl>" + rasgos + "</dl>" +
      (confs ? '<div class="conf"><h4>Se confunde con</h4><ul>' + confs + "</ul></div>" : "") +
      "</div></article>";
  }

  function renderGallery() {
    galleryEl.innerHTML = GROUPS.filter(function (g) {
      return filter === "todas" || filter === g.id;
    }).map(function (g) {
      var list = SPECIES.filter(function (s) { return s.group === g.id; });
      return '<section class="grupo tone-' + g.tone + '" aria-labelledby="g-' + g.id + '">' +
        '<h2 id="g-' + g.id + '"><span class="dot"></span>' + esc(g.label) + "</h2>" +
        '<p class="nota">' + esc(g.note) + "</p>" +
        '<div class="rejilla">' + list.map(cardHTML).join("") + "</div></section>";
    }).join("");
  }

  // Cambiar de foto dentro de una ficha
  galleryEl.addEventListener("click", function (e) {
    var t = e.target.closest(".thumb");
    if (t) {
      var card = t.closest(".card"), s = byId[card.getAttribute("data-id")];
      var im = s.imgs[+t.getAttribute("data-i")];
      var img = card.querySelector(".foto img");
      img.src = "img/" + im.f;
      card.querySelector("figcaption").textContent = im.cap;
      card.querySelectorAll(".thumb").forEach(function (b) { b.classList.toggle("on", b === t); });
      return;
    }
    var go = e.target.closest("[data-go]");
    if (go) {
      var from = go.closest(".card").getAttribute("data-id");
      jumpTo(go.getAttribute("data-go"), from);
    }
  });

  // ---------- Saltar a otra especie y volver ----------
  var volverEl = document.getElementById("volver");
  var flashTimer, origin = null;

  function jumpTo(id, from) {
    var target = document.getElementById("sp-" + id);
    if (!target) {              // el filtro la oculta: quita el filtro y vuelve a pintar
      filter = "todas"; renderFilters(); renderGallery();
      target = document.getElementById("sp-" + id);
    }
    if (!target) return;
    origin = from || null;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.querySelectorAll(".card.flash").forEach(function (c) { c.classList.remove("flash"); });
    target.classList.add("flash");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { target.classList.remove("flash"); }, 2200);
    showVolver();
  }

  function showVolver() {
    if (!origin || !byId[origin]) { volverEl.hidden = true; return; }
    volverEl.textContent = "↩ Volver a " + byId[origin].es;
    volverEl.hidden = false;
  }
  volverEl.addEventListener("click", function () {
    var back = origin;
    origin = null; volverEl.hidden = true;
    if (back) jumpTo(back, null);
  });

  // Enlace directo: index.html#sp-edulis
  function fromHash() {
    var m = /^#sp-([a-z]+)$/.exec(location.hash);
    if (m && byId[m[1]]) setTimeout(function () { jumpTo(m[1], null); }, 50);
  }

  // ---------- Créditos ----------
  document.getElementById("credits").innerHTML = SPECIES.reduce(function (acc, s) {
    s.imgs.forEach(function (im) {
      var c = CREDITS[im.f];
      if (!c) return;
      acc.push('<li><a href="' + esc(c.page) + '" target="_blank" rel="noopener">' + esc(s.sci) + "</a> — " +
        esc(c.artist) + ", " + esc(c.lic) + "</li>");
    });
    return acc;
  }, []).join("");

  renderFilters();
  renderGallery();
  fromHash();
})();
