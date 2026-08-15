const LONDON_CENTER = [51.509, -0.095];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasCoords(place) {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSpots(data) {
  const eaten = data.visited.map((p) => ({
    id: "v:" + p.name,
    slug: "v-" + slugify(p.name),
    kind: "eaten",
    name: p.name,
    ll: hasCoords(p) ? [p.lat, p.lng] : null,
    googleMapsLink: p.googleMapsLink,
    overallRating: p.overallRating,
    summary: p.summary,
    fields: p.fields,
  }));
  const totry = data.wishlist.map((p) => ({
    id: "w:" + p.name,
    slug: "w-" + slugify(p.name),
    kind: "totry",
    name: p.name,
    ll: hasCoords(p) ? [p.lat, p.lng] : null,
    googleMapsLink: p.googleMapsLink,
  }));
  return eaten.concat(totry);
}

(async function init() {
  const res = await fetch("pizzas.json");
  const data = await res.json();
  const SPOTS = toSpots(data);
  const plottable = SPOTS.filter((s) => s.ll);
  const missing = SPOTS.length - plottable.length;

  const geoHint = document.getElementById("geoHint");
  if (missing > 0) {
    geoHint.hidden = false;
    geoHint.innerHTML =
      missing === SPOTS.length
        ? "No places have coordinates yet. Add <code>lat</code>/<code>lng</code> to entries in <a href=\"pizzas.json\">pizzas.json</a> to see them on the map."
        : missing + " place" + (missing === 1 ? "" : "s") + " still need" + (missing === 1 ? "s" : "") + " coordinates in <a href=\"pizzas.json\">pizzas.json</a>.";
  }

  const map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
    maxZoom: 18,
    minZoom: 10,
  }).setView(LONDON_CENTER, 12);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  const markers = {};
  const panel = document.getElementById("panel");
  let openId = null;

  function makeIcon(s) {
    const label = s.kind === "eaten" && s.overallRating ? s.overallRating.score.toFixed(1) : "?";
    return L.divIcon({
      className: "",
      html:
        '<div class="pin ' + s.kind + '" data-id="' + escapeHtml(s.id) + '"><i class="stem"></i>' +
        '<div class="dot">' + escapeHtml(label) + "</div></div>",
      iconSize: [36, 48],
      iconAnchor: [18, 48],
    });
  }

  plottable.forEach((s) => {
    const m = L.marker(s.ll, { icon: makeIcon(s), title: s.name, riseOnHover: true, keyboard: true }).addTo(map);
    m.on("click", () => openSpot(s.id));
    m.on("keypress", () => openSpot(s.id));
    markers[s.id] = m;
  });

  function pinEl(id) {
    const marker = markers[id];
    if (!marker) return null;
    const el = marker.getElement();
    return el ? el.querySelector(".pin") : null;
  }

  /* ── focus scaling: pins nearer the viewport centre render bigger ── */
  const FOCUS_MIN_SCALE = 0.65;
  const FOCUS_MAX_SCALE = 1.15;

  function updatePinFocusScale() {
    const size = map.getSize();
    const cx = size.x / 2;
    const cy = size.y / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;

    plottable.forEach((s) => {
      const m = markers[s.id];
      if (!m || !map.hasLayer(m)) return;
      const pt = map.latLngToContainerPoint(s.ll);
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const t = Math.min(Math.sqrt(dx * dx + dy * dy) / maxDist, 1);
      const scale = FOCUS_MAX_SCALE - t * (FOCUS_MAX_SCALE - FOCUS_MIN_SCALE);
      const pin = pinEl(s.id);
      if (pin) pin.style.setProperty("--focus-scale", scale.toFixed(3));
    });
  }

  let focusScaleQueued = false;
  function scheduleFocusScaleUpdate() {
    if (focusScaleQueued) return;
    focusScaleQueued = true;
    requestAnimationFrame(() => {
      focusScaleQueued = false;
      updatePinFocusScale();
    });
  }

  function ratingRow(letter, field) {
    const hasRating = field && typeof field.rating === "number";
    const cls = hasRating ? "r" + field.rating : "no";
    const text = hasRating ? field.label || "" : "none";
    return (
      '<div class="row"><div class="letter">' + letter + "</div>" +
      '<span class="badge ' + cls + '">' + escapeHtml(text) + "</span></div>"
    );
  }

  function theCsRow(theCs) {
    if (!theCs || Object.keys(theCs).length === 0) {
      return '<div class="row"><div class="letter">C</div><span class="badge no">none</span></div>';
    }
    const badges = Object.entries(theCs)
      .map(([k, v]) => '<span class="badge cs"><b>' + escapeHtml(k) + ":</b> " + escapeHtml(v) + "</span>")
      .join("");
    return '<div class="row"><div class="letter">C</div><div class="cs-badges">' + badges + "</div></div>";
  }

  function edRow(edFactor) {
    const cls = !edFactor ? "no" : edFactor.status === "confirmed" ? "yes" : edFactor.status === "unconfirmed" ? "partial" : "no";
    const text = edFactor ? edFactor.status : "none";
    return (
      '<div class="row"><div class="letter">E</div>' +
      '<span class="badge ' + cls + '">' + escapeHtml(text) + "</span></div>"
    );
  }

  function panelHTML(s) {
    const close =
      '<button class="close" type="button" id="closeBtn" aria-label="close">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    const shareBtn =
      '<button class="share-btn" type="button" data-slug="' + escapeHtml(s.slug) + '" data-name="' + escapeHtml(s.name) + '" aria-label="share ' + escapeHtml(s.name) + '" title="share">' +
      '<svg class="share-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' +
      '<svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' +
      "</button>";
    const mapsBtn =
      '<a class="maps" href="' + s.googleMapsLink + '" target="_blank" rel="noopener" aria-label="open in google maps" title="open in google maps">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg></a>';
    const footActions = '<div class="foot-actions">' + shareBtn + mapsBtn + "</div>";

    if (s.kind === "totry") {
      return (
        close +
        '<div class="p-head"><div class="p-kick totry">on the list</div>' +
        '<div class="p-name">' + escapeHtml(s.name) + "</div></div>" +
        '<div class="p-foot"><div class="p-date">unrated</div>' + footActions + "</div>"
      );
    }

    const scoreHtml = s.overallRating
      ? '<div class="score">' + s.overallRating.score + '<span>/' + s.overallRating.outOf + "</span></div>"
      : "";
    const summaryHtml = s.summary ? '<p class="p-review">' + escapeHtml(s.summary) + "</p>" : "";
    const fields = s.fields;
    const niceRows =
      ratingRow("N", fields && fields.nice) +
      ratingRow("I", fields && fields.italian) +
      theCsRow(fields && fields.theCs) +
      edRow(fields && fields.edFactor);

    return (
      close +
      scoreHtml +
      '<div class="p-head' + (scoreHtml ? " has-score" : "") + '">' +
      '<div class="p-top"><div class="p-kick">eaten &amp; rated</div>' +
      '<div class="p-name">' + escapeHtml(s.name) + "</div></div>" +
      summaryHtml +
      "</div>" +
      '<div class="nice">' + niceRows + "</div>" +
      '<div class="p-foot with-key">' +
      '<div class="key"><b>N</b> nice &middot; <b>I</b> italian-ness, innovative-ness &middot; <b>C</b> crust, cheese, cost, company &middot; ' +
      "<b>E</b> did Ed shake his hand in satisfaction</div>" +
      footActions +
      "</div>"
    );
  }

  function place(s) {
    const pt = map.latLngToContainerPoint(s.ll);
    const rect = map.getContainer().getBoundingClientRect();
    const px = rect.left + pt.x;
    const py = rect.top + pt.y - 46;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;

    let x = Math.min(Math.max(12, px - w / 2), vw - w - 12);
    let y = py - h - 16;
    if (y < 74) y = Math.min(py + 60, vh - h - 96);
    y = Math.max(y, 12);

    panel.style.left = x + "px";
    panel.style.top = y + "px";
    panel.style.transformOrigin = px - x + "px " + (py - y) + "px";
  }

  function openSpot(id) {
    const s = plottable.find((v) => v.id === id);
    if (!s) return;
    if (openId === id) {
      closePanel();
      return;
    }
    closePanel(true);
    openId = id;
    const p = pinEl(id);
    if (p) p.classList.add("on");
    panel.innerHTML = panelHTML(s);
    panel.classList.remove("open");
    panel.style.visibility = "hidden";

    const target = map.project(s.ll, map.getZoom());
    const size = map.getSize();
    const wantY = size.y * (window.innerHeight < 620 ? 0.62 : 0.66);
    const center = map.unproject([target.x, target.y - (wantY - size.y / 2)], map.getZoom());
    map.panTo(center, { animate: true, duration: 0.35 });

    setTimeout(() => {
      panel.style.visibility = "";
      place(s);
      requestAnimationFrame(() => panel.classList.add("open"));
    }, 380);
  }

  function closePanel(silent) {
    if (openId != null) {
      const p = pinEl(openId);
      if (p) p.classList.remove("on");
    }
    openId = null;
    panel.classList.remove("open");
    if (!silent) updateCount();
  }

  function shareSpot(btn) {
    const url = location.origin + location.pathname + "?spot=" + btn.dataset.slug;
    if (navigator.share) {
      navigator.share({ title: btn.dataset.name, url }).catch(() => {});
      return;
    }
    const showDone = () => {
      btn.classList.add("done");
      setTimeout(() => btn.classList.remove("done"), 1400);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(showDone, () => window.prompt("Copy this link:", url));
    } else {
      window.prompt("Copy this link:", url);
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#closeBtn")) {
      closePanel();
      return;
    }
    const shareBtn = e.target.closest(".share-btn");
    if (shareBtn) {
      shareSpot(shareBtn);
      return;
    }
    if (e.target.closest("#panel") || e.target.closest(".pin") || e.target.closest(".filters") || e.target.closest(".bar")) return;
    closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
  map.on("movestart zoomstart", () => {
    if (panel.classList.contains("open")) closePanel();
  });
  map.on("move zoom", scheduleFocusScaleUpdate);
  window.addEventListener("resize", () => {
    closePanel();
    scheduleFocusScaleUpdate();
  });
  updatePinFocusScale();

  /* ── filtering ─────────────────────────────────────────────── */
  let filter = "all";
  const buttons = [...document.querySelectorAll("#filters button")];

  function updateCount() {
    const eaten = SPOTS.filter((s) => s.kind === "eaten").length;
    const totry = SPOTS.length - eaten;
    const el = document.getElementById("count");
    el.textContent =
      filter === "eaten" ? eaten + " eaten" : filter === "totry" ? totry + " to try" : eaten + " eaten · " + totry + " to try";
  }

  function applyFilter(f) {
    filter = f;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
    plottable.forEach((s) => {
      const show = f === "all" || s.kind === f;
      const m = markers[s.id];
      if (show && !map.hasLayer(m)) m.addTo(map);
      if (!show && map.hasLayer(m)) map.removeLayer(m);
    });
    closePanel(true);
    updateCount();
    updatePinFocusScale();
  }

  buttons.forEach((b) => b.addEventListener("click", () => applyFilter(b.dataset.f)));
  updateCount();

  /* ── suggest a place ──────────────────────────────────────── */
  const suggestBtn = document.getElementById("suggestBtn");
  const suggestBackdrop = document.getElementById("suggestBackdrop");
  const suggestForm = document.getElementById("suggestModal");
  const suggestClose = document.getElementById("suggestClose");
  const suggestCancel = document.getElementById("suggestCancel");

  function openSuggest() {
    closePanel();
    suggestForm.reset();
    suggestBackdrop.hidden = false;
    document.getElementById("suggestName").focus();
  }

  function closeSuggest() {
    suggestBackdrop.hidden = true;
    suggestBtn.focus();
  }

  suggestBtn.addEventListener("click", openSuggest);
  suggestClose.addEventListener("click", closeSuggest);
  suggestCancel.addEventListener("click", closeSuggest);
  suggestBackdrop.addEventListener("click", (e) => {
    if (e.target === suggestBackdrop) closeSuggest();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !suggestBackdrop.hidden) closeSuggest();
  });

  suggestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("suggestName").value.trim();
    const link = document.getElementById("suggestLink").value.trim();
    const note = document.getElementById("suggestNote").value.trim();
    if (!name) return;

    const subject = "Pizza suggestion: " + name;
    const lines = ["Place: " + name];
    if (link) lines.push("Google Maps: " + link);
    if (note) lines.push("", "Why: " + note);

    const mailto =
      "mailto:pizza@gorman.club?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(lines.join("\n"));

    window.location.href = mailto;
    closeSuggest();
  });

  /* ── mascot easter egg ────────────────────────────────────── */
  const mascotBtn = document.getElementById("mascotBtn");
  const mascotVideo = document.getElementById("mascotVideo");

  mascotBtn.addEventListener("click", () => {
    if (mascotBtn.classList.contains("playing")) return;
    mascotBtn.classList.add("playing");
    mascotVideo.currentTime = 0;
    mascotVideo.play().catch(() => mascotBtn.classList.remove("playing"));
  });

  mascotVideo.addEventListener("ended", () => {
    mascotBtn.classList.remove("playing");
  });

  /* ── open a shared spot from the URL ─────────────────────────── */
  const sharedSlug = new URLSearchParams(location.search).get("spot");
  if (sharedSlug) {
    const shared = plottable.find((s) => s.slug === sharedSlug);
    if (shared) openSpot(shared.id);
  }
})();
