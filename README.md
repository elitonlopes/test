# EverAtlas Constellation: prototype

An interactive way to explore a whole person, not just their career. This prototype shows it with a **clearly fictional** sample person, Noor Halvorsen.

Open `index.html` in a browser. There is no build step and no dependencies apart from Google Fonts. You can also serve the folder with any static server, for example `npx http-server .`.

## The idea: an atlas of a person

EverAtlas already speaks the language of maps, so the Constellation is drawn as **an archipelago**. Each island is one part of a life: design work, music, family and friends, community, a new beekeeping habit.

| Map convention | What it means here |
| --- | --- |
| Land area | Roughly how much time went into this part of life. Time only: never skill, success or worth. |
| Dotted tideline | The island's size in the *other* perspective, so change is visible without animation. |
| Hatched land, dashed coast | "Uncharted": the owner shared no estimate, so it is drawn at a neutral size with no number. |
| Dotted outline | Resting for now (0 hours a week). It stays on the map. |
| `◦` after an estimate | A very small share, drawn at a minimum size so it stays findable. |
| Places on an island | Experiences. The glyph *shape* shows the kind (role, project, skill, creation…). Earlier ones sit inland and recent ones near the shore. |
| Sea routes | Owner-confirmed connections, labelled in plain words ("Inspired", "Led to", "Developed this skill"). |
| Buoys offshore | What the person is working toward next. |
| Scale square | How much land stands for 1,000 hours (or 1 hour a week). It adapts to the zoom level. |
| Colour | Purple land = life so far, lime land = life now. Colour always repeats information that is also given in text or shape. |

### The two perspectives

- **Life so far**: approximate total hours, as ranges ("5,000–10,000 hours").
- **Life now**: a typical week ("3–6 hours a week").

Switching reshapes the islands in place. Every island keeps its bearing because both layouts relax from the same anchors, and the land shifts from purple to lime. Islands whose share changed a lot get a text label ("↑ more now", "↓ less now"). A caption and a screen-reader announcement summarise what changed.

### Progressive exploration

1. **Whole person.** The portrait panel answers who they are beyond their title, where their time has gone, what matters now, what they're working toward, and a seasonal note in their own words.
2. **A part of life.** The camera flies to the island and labels its places. The panel lists them under *Now* and *Earlier*, with both estimates, next goals, and links to other parts of life. A breadcrumb shows the way back.
3. **An experience.** A paper "field note" card shows the title, dates, description, media, skills and connections. Only this experience's routes are drawn, so connections never show all at once. **Following a route** sends a light along the sea path to the other island.

### Returning visitors

Things added since your last visit get a small beacon and a "new" tag. On a first visit, anything added in the last few weeks is marked instead. The seasonal note and the owner's recent updates give a reason to come back. There are no streaks, counts or rankings.

## Owner studio (`#studio`)

Kept separate from the visitor view, and clearly labelled as owner-only.

- **Parts of life and rough time.** Pick a *range* for each perspective, or "Not sure / rather not say". No exact figures.
- **From your profile.** Tick which existing profile items to publish. Items that are private in the profile can't be published from here.
- **Connections.** EverAtlas suggestions wait in a "Suggested" list that visitors never see. The owner confirms (and can reword) or dismisses each one. Confirmed connections that touch a private or unpublished item are flagged as hidden, with the reason.
- **What's next** and **In your words** fields.
- A live **preview** of the automatic composition, and a plain-language **list of changes** before publishing. The owner can also discard the draft or reset to the sample.

In this prototype the draft and published data live in `localStorage`, standing in for a backend.

## Accessibility, mobile, privacy

- **Read as text** (`#text`) has the same content: estimates in a table, every experience, and every connection in words.
- **Profile page** (`#profile`) keeps the classic personal page as another way in.
- Keyboard: Tab moves between islands (in reading order), arrow keys jump to the neighbouring island, Enter opens, Escape steps back, and T switches perspective. Focus moves to the new heading and returns where it came from. Focus is always visible.
- Reduced motion follows the operating system setting and can be overridden with the Motion button. With motion reduced, every transition is instant.
- On phones the map comes first. The portrait and territory lists become a bottom sheet, the detail card becomes a sheet, and the composition is laid out for a portrait screen instead of shrinking the desktop layout.
- `EA.publicView()` in `js/model.js` is the single gate for what visitors receive. It drops unincluded or private items, and it drops any connection unless the owner confirmed it and both ends are published.

## Files

```
index.html              page shell: map, panels, text and profile views, studio
css/constellation.css   visual identity and responsive layout
js/data.js              FICTIONAL sample content, estimate ranges, kinds, relationship wording
js/model.js             storage, privacy filter, estimates, composition geometry, diffing
js/atlas.js             the interactive SVG map (layout, morphing, camera, routes, keyboard)
js/app.js               visitor experience: panels, detail card, text view, profile page, routing
js/studio.js            owner studio
```

## Not in this prototype

Real authentication and persistence, real media playback, and importing from a live EverAtlas profile. The sample content stands in for that import.
