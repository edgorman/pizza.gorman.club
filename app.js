async function loadData() {
  const res = await fetch("pizzas.json");
  if (!res.ok) throw new Error(`Failed to load pizzas.json: ${res.status}`);
  return res.json();
}

function normalizedScore(overallRating) {
  if (!overallRating || !overallRating.outOf) return -1;
  return (overallRating.score / overallRating.outOf) * 10;
}

function ratingBadge(overallRating) {
  if (!overallRating) return `<span class="rating-badge unrated">Not yet rated</span>`;
  return `<span class="rating-badge">${overallRating.score}/${overallRating.outOf}</span>`;
}

function theCsList(theCs) {
  if (!theCs || Object.keys(theCs).length === 0) return "";
  const rows = Object.entries(theCs)
    .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
    .join("");
  return `<div class="the-cs"><strong>The C's</strong><dl>${rows}</dl></div>`;
}

function chips(fields) {
  if (!fields) return "";
  const out = [];
  if (fields.nice && fields.nice.label) {
    out.push(`<span class="chip">Nice: ${escapeHtml(fields.nice.label)}</span>`);
  }
  if (fields.italian && fields.italian.label) {
    out.push(`<span class="chip italian">Italian-ness: ${escapeHtml(fields.italian.label)}</span>`);
  }
  if (fields.edFactor && fields.edFactor.status) {
    out.push(`<span class="chip ed">Ed factor: ${escapeHtml(fields.edFactor.status)}</span>`);
  }
  return out.length ? `<div class="chips">${out.join("")}</div>` : "";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function visitedCard(place) {
  const summary = place.summary ? `<p class="summary">${escapeHtml(place.summary)}</p>` : "";
  return `
    <div class="card">
      <div class="card-head">
        <a href="${place.googleMapsLink}" target="_blank" rel="noopener">${escapeHtml(place.name)}</a>
        ${ratingBadge(place.overallRating)}
      </div>
      ${summary}
      ${chips(place.fields)}
      ${theCsList(place.fields && place.fields.theCs)}
    </div>
  `;
}

function wishlistCard(place) {
  return `
    <div class="card">
      <a href="${place.googleMapsLink}" target="_blank" rel="noopener">${escapeHtml(place.name)}</a>
    </div>
  `;
}

function render(data, tab, query) {
  const main = document.getElementById("main");
  const q = query.trim().toLowerCase();

  if (tab === "visited") {
    const items = data.visited
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => normalizedScore(b.overallRating) - normalizedScore(a.overallRating));
    document.getElementById("count").textContent = `${items.length} place${items.length === 1 ? "" : "s"}`;
    main.innerHTML = items.length
      ? `<div class="grid">${items.map(visitedCard).join("")}</div>`
      : `<p class="empty">No pizza places match "${escapeHtml(query)}".</p>`;
  } else {
    const items = data.wishlist.filter((p) => p.name.toLowerCase().includes(q));
    document.getElementById("count").textContent = `${items.length} place${items.length === 1 ? "" : "s"}`;
    main.innerHTML = items.length
      ? `<div class="wishlist-grid">${items.map(wishlistCard).join("")}</div>`
      : `<p class="empty">No pizza places match "${escapeHtml(query)}".</p>`;
  }
}

(async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    document.getElementById("main").innerHTML = `<p class="empty">Could not load pizzas.json: ${escapeHtml(err.message)}</p>`;
    return;
  }

  let tab = "visited";
  const search = document.getElementById("search");

  function rerender() {
    render(data, tab, search.value);
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      search.placeholder = tab === "visited" ? "Search visited pizzerias…" : "Search the wishlist…";
      rerender();
    });
  });

  search.addEventListener("input", rerender);

  rerender();
})();
