# pizza.gorman.club

A map of London pizza places (`index.html` / `app.js` / `styles.css`, using Leaflet), rendered from a single data file: `pizzas.json`.

## Adding a place

Edit `pizzas.json` directly (it's validated by `pizzas.schema.json`, so most editors will give you autocomplete and inline errors).

**Want to try it, haven't been yet** — add to `wishlist`:

```json
{ "name": "Place Name", "googleMapsLink": "https://www.google.com/maps/place/...", "lat": null, "lng": null }
```

**Already been** — add to `visited`:

```json
{
  "name": "Place Name",
  "googleMapsLink": "https://www.google.com/maps/place/...",
  "lat": null,
  "lng": null,
  "overallRating": { "score": 8, "outOf": 10 },
  "summary": "One line about the visit.",
  "fields": {
    "nice": { "rating": 4, "label": "Very nice", "note": "very nice" },
    "italian": { "rating": 3, "label": "Quite Italian", "note": "quite Italian" },
    "theCs": {
      "crust": "great",
      "cheese": "good",
      "cost": "a bit pricey",
      "company": "the best"
    },
    "edFactor": { "status": "confirmed", "note": "confirmed and witnessed" }
  }
}
```

## Coordinates

A place only shows up as a pin once both `lat` and `lng` are set — leave them `null` and it stays off the map (the banner at the top of the page counts how many are still missing). To find them: open `googleMapsLink`, right-click the pin on google.com/maps and click the lat/lng shown at the top of the context menu (or check the URL after it centers on the place — it looks like `.../@51.5225,-0.1155,17z/...`), then copy those two numbers in as `lat`, `lng`.

## Other rules of thumb

- `nice` / `italian` — a 1-5 rating with a short text `label`: 1 not, 2 kinda/not very, 3 plain (no qualifier), 4 quite, 5 very/extremely. ("Quite" reads as more positive than a plain "nice", so it sits above the midpoint, not at it.) Leave `rating`/`label` as `null` if it doesn't fit the scale (e.g. the note wasn't really about niceness or Italian-ness).
- `theCs` — only include the crust/cheese/cost/company keys that were actually mentioned.
- `edFactor.status` — one of `confirmed` (definitely happened), `unconfirmed` (might have, not verified either way), or `none` (explicitly did not happen, or nothing recorded).
- Haven't rated a visited place yet? Set `overallRating`, `summary`, and/or `fields` to `null` — it'll still show up on the map (as an "eaten" pin marked `?`) once it has coordinates.

No build step — just edit the JSON, commit, and push. GitHub Pages serves the static files directly. Leaflet is vendored in `vendor/leaflet/` (no CDN dependency); map tiles come from OpenStreetMap and Caprasimo/Figtree fonts from Google Fonts at runtime.
