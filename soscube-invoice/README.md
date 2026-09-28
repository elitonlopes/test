# SOSCube Smart Invoice Processing: product page and demo

A product-page prototype for SOSCube's Smart Invoice Processing solution, with a working review demo built on a utility-invoice workflow.

Open `index.html` in a browser. It is a single self-contained file (Google Fonts is the only external request). No build step.

## What the demo does

Three fictional invoices sit in a review queue:

| Invoice | Scenario | What the reviewer does |
| --- | --- | --- |
| `DEMO-2026-0901` · electricity · LUX-01 | 12,840 kWh vs 10,000 kWh in July (+28.4%) breaks the ±15% rule | Energy analyst acknowledges the alert with a reason |
| `GZ-DEMO-2026-0877` · gas | No building code on the invoice | Facilities coordinator applies `LUX-03` from the building register (address match) |
| `EDN-DEMO-2026-0412` · water · LUX-04 | No rules flagged | Goes straight to approval |

For each invoice you can select any extracted field to highlight where it appears on the source document (with secondary occurrences dashed), zoom (Fit / 150% / 220%) or open a large view, resolve exceptions, confirm the source check, approve, download the approved record as CSV and reset the demo.

States: **Pending review** → **Approved** (all checks complete) → **Reported** (after the CSV is downloaded or copied). Reported is simulated. Nothing is sent to any system.

Keyboard: arrow keys move between queue items and between fields (Home/End jump to the first or last field), Escape closes the large view.

## Using the real invoice image

The electricity invoice is currently drawn as an SVG specimen that matches the brief's values. To use the generated image instead:

1. Save it as `assets/invoice-demo-2026-0901.png`.
2. Open `index.html#calibrate`, load the image, pick each field and drag a box over its value (Shift+drag adds a second place for the same field).
3. Copy the JSON into `SOURCE_IMAGE.boxes` near the top of the script.

Boxes are stored as fractions of the image size, so highlights stay aligned at any display size.

## Boundaries

All data is fictional. Extraction is simulated with pre-loaded values; no OCR runs, no client systems are connected and no payments are processed. The electricity specimen is inspired by a Luxembourg utility layout and is not issued by LEO. The page contains no testimonials, certifications, accuracy figures, savings claims or pricing.
