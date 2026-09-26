# Constellation → in-the-making (EverAtlas on Lovable)

Everything needed to add the Constellation to `elitonlopes/in-the-making`.

```
python3 apply.py /path/to/in-the-making
node --experimental-strip-types tests/constellation.test.mjs   # run inside in-the-making
```

What it adds:

| File | Purpose |
| --- | --- |
| `src/features/constellation/engine.js` | The map engine, mounted like `features/life/runtime.js` (`mountConstellation(root, data)` returns a cleanup). Safe to import during SSR. |
| `src/features/constellation/adapter.ts` | Published snapshot → Constellation data. Roles, entries (grouped by `domain`, else category), songs, books; role → project links come from the profile. |
| `src/features/constellation/ConstellationView.tsx`, `head.ts` | React wrapper, and the head links (stylesheet and fonts). |
| `src/features/constellation/constellation.css` | Styles, all scoped to `.constellation-app`. |
| `src/features/constellation/example-data.ts` | Fictional example (Noor Halvorsen) in the real snapshot format. |
| `src/routes/u.$username_.constellation.tsx` | `/u/:username/constellation` |
| `src/routes/example_.constellation.tsx` | `/example/constellation` |
| `tests/constellation.test.mjs` | Schema, privacy and adapter tests. |

What it edits (small anchored edits; the script stops if an anchor moved):

- `state-schema.ts`: optional `profile.constellation` (area names, rough time ranges, item → area moves, connections, what's next). The published snapshot only keeps **confirmed** connections, and only between published items, so a note can't reveal something private.
- `PublicPageView.tsx` and `u.$username.tsx`: an "Explore as a Constellation →" link on real public pages.

Without any Constellation settings, a person's islands are all drawn at the same neutral size (no invented numbers), and the only connections are the role → project links they already entered.

Next step (not included yet): a "Constellation" panel in the editor (`runtime.js`) where owners pick time ranges and confirm or dismiss suggested connections. When it's added, the publish path should call `publicConstellation(profile, entries)`.
