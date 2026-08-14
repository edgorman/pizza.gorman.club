# pizza.gorman.club

A running log of London pizza places, rendered by `index.html` / `app.js` / `styles.css` from a single data file: `pizzas.json`.

## Adding a place

Edit `pizzas.json` directly (it's validated by `pizzas.schema.json`, so most editors will give you autocomplete and inline errors).

**Want to try it, haven't been yet** — add to `wishlist`:

```json
{ "name": "Place Name", "googleMapsLink": "https://www.google.com/maps/place/..." }
```

**Already been** — add to `visited`:

```json
{
  "name": "Place Name",
  "googleMapsLink": "https://www.google.com/maps/place/...",
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

Rules of thumb:

- `nice` / `italian` — a 1 (not at all) to 5 (extremely) rating with a short text `label`. Leave `rating`/`label` as `null` if it doesn't fit the scale (e.g. the note wasn't really about niceness or Italian-ness).
- `theCs` — only include the crust/cheese/cost/company keys that were actually mentioned.
- `edFactor.status` — one of `confirmed`, `partial`, `unconfirmed`, `unknown`.
- Haven't rated it yet? Set `overallRating`, `summary`, and/or `fields` to `null`.

No build step — just edit the JSON, commit, and push. GitHub Pages serves the static files directly.
