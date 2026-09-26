// Run with: node --experimental-strip-types tests/constellation.test.mjs
import assert from "node:assert/strict";
import { parseState, publicProfile } from "../src/features/life/state-schema.ts";
import { snapshotToConstellation } from "../src/features/constellation/adapter.ts";
import { CONSTELLATION_EXAMPLE_SNAPSHOT } from "../src/features/constellation/example-data.ts";
import { EA } from "../src/features/constellation/engine.js";

// The example snapshot is a valid published profile and survives the schema untouched.
const ex = structuredClone(CONSTELLATION_EXAMPLE_SNAPSHOT);
const state = parseState({ goals: [], entries: ex.entries, profile: ex.profile, published: ex });
assert.equal(state.profile.constellation.areas.length, 9);
assert.equal(state.published.profile.constellation.links.length, 14);

// Suggestions never leave the owner's space, and links to private items are dropped with their notes.
const owner = structuredClone(ex);
owner.profile.constellation.links.push(
  { id: "sugg", from: "k1", to: "w7", rel: "developed", status: "suggested", note: "" },
  {
    id: "priv",
    from: "secret",
    to: "r1",
    rel: "changed_direction",
    status: "confirmed",
    note: "Private note",
  },
);
owner.entries.push({
  id: "secret",
  title: "Private",
  category: "Memory",
  date: "2019-05",
  text: "Secret",
  public: false,
});
const parsed = parseState({
  goals: [],
  entries: owner.entries,
  profile: owner.profile,
  published: owner,
});
const pubLinks = parsed.published.profile.constellation.links.map((l) => l.id);
assert.ok(!pubLinks.includes("sugg"));
assert.ok(!pubLinks.includes("priv"));
assert.ok(!JSON.stringify(parsed.published).includes("Private note"));
assert.ok(!publicProfile(owner.profile).constellation.links.some((l) => l.status !== "confirmed"));

// The adapter builds areas, estimates and connections from the snapshot.
const data = snapshotToConstellation(parsed.published);
assert.deepEqual(
  data.territories.map((t) => t.id),
  [
    "work",
    "learning",
    "music",
    "family-friends",
    "running",
    "community",
    "letters-clay",
    "theatre",
    "beekeeping",
  ],
);
assert.equal(data.territories.find((t) => t.id === "family-friends").soFar, null);
const view = EA.publicView(data);
assert.equal(view.connections.length, 17);
assert.ok(view.connections.every((c) => view.byId.has(c.from) && view.byId.has(c.to)));

// Without any Constellation settings, every island is neutral: nothing is invented.
const bare = snapshotToConstellation({
  profile: { name: "A", experience: [] },
  entries: [
    { id: "e1", title: "T", category: "Creation", date: "2026-01", text: "", public: true },
  ],
});
assert.equal(bare.territories.length, 1);
assert.equal(EA.estimate(bare.territories[0], "soFar").known, false);
console.log(
  "Passed: schema round-trip, suggestion and private-link stripping, adapter areas/estimates/links, neutral defaults.",
);
