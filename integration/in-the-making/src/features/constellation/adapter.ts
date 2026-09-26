/* Builds Constellation data from a published EverAtlas snapshot.
 *
 * Input is the same `{ profile, entries }` snapshot the public page renders. It has
 * already been through publicProfile(), so private roles, books and entries are gone
 * before anything here runs. Owner-only data (suggested connections) never reaches
 * this point, and connections whose ends aren't published are dropped by the engine.
 */

type Role = {
  id: string;
  title?: string;
  org?: string;
  start?: string;
  end?: string;
  current?: boolean;
  summary?: string;
  achievements?: string[];
  projects?: string[];
};
type Entry = {
  id: string;
  title?: string;
  category?: string;
  date?: string;
  text?: string;
  public?: boolean;
  status?: string;
  tags?: string[];
  domain?: string;
  cover?: string;
  link?: string;
  linkLabel?: string;
};
type Song = {
  id: string;
  title?: string;
  artist?: string;
  note?: string;
  cover?: string;
  link?: string;
};
type Book = {
  id: string;
  title?: string;
  author?: string;
  year?: string;
  note?: string;
  status?: string;
  cover?: string;
  public?: boolean;
  featured?: boolean;
  written?: boolean;
};
type Profile = {
  name?: string;
  headline?: string;
  bio?: string;
  experience?: Role[];
  media?: { songs?: Song[]; books?: Book[] };
  constellation?: ConstellationConfig;
};

type Media =
  { type: "image"; src: string; alt: string } | { type: "link"; url: string; label: string };
export type Place = {
  id: string;
  t: string;
  kind: string;
  title: string;
  start: string;
  end: string | null;
  desc: string;
  bullets?: string[];
  skills?: string[];
  media?: Media[];
  include: boolean;
};
export type Connection = {
  id: string;
  from: string;
  to: string;
  rel: string;
  status: "confirmed";
  origin: "profile" | "owner";
  note: string;
};
export type Territory = {
  id: string;
  name: string;
  include: boolean;
  soFar: string | null;
  now: string | null;
  blurb: string;
};

export type ConstellationArea = {
  id: string;
  name: string;
  /** Rough lifetime estimate, one of the soFar bucket ids (e.g. "2k-5k"), or empty. */
  soFar?: string;
  /** Rough typical-week estimate, one of the now bucket ids (e.g. "3-6"), or empty. */
  now?: string;
  include?: boolean;
  blurb?: string;
};
export type ConstellationLink = {
  id: string;
  from: string;
  to: string;
  rel: "inspired" | "developed" | "led_to" | "changed_direction" | "fed_into" | "shaped";
  note?: string;
  status: "confirmed" | "suggested";
};
export type ConstellationConfig = {
  areas?: ConstellationArea[];
  /** Item id → area id, for anything the owner moved out of its default area. */
  assign?: Record<string, string>;
  links?: ConstellationLink[];
  horizon?: { id: string; area: string; title: string; when?: string }[];
  now?: string;
};

export type ConstellationData = {
  person: { name: string; title: string; beyond: string; now: string };
  territories: Territory[];
  experiences: Place[];
  connections: Connection[];
  horizon: { id: string; t: string; title: string; when: string }[];
};

const DEFAULT_AREAS: Record<string, string> = {
  work: "Work",
  creations: "Creations",
  learning: "Learning",
  milestones: "Milestones",
  memories: "Memories",
  music: "Music",
  reading: "Reading",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "other";

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function snapshotToConstellation(snapshot: {
  profile: unknown;
  entries: unknown[];
}): ConstellationData {
  const profile = (snapshot.profile || {}) as Profile;
  const cfg = (profile.constellation || {}) as ConstellationConfig;
  const assign = cfg.assign || {};
  const areaNames = new Map<string, string>();
  const experiences: Place[] = [];
  const connections: Connection[] = [];

  const place = (id: string, fallbackArea: string, fallbackName?: string) => {
    const area = assign[id] || fallbackArea;
    if (!areaNames.has(area)) areaNames.set(area, fallbackName || DEFAULT_AREAS[area] || area);
    return area;
  };

  /* Roles from the work & experience section */
  const roles = profile.experience || [];
  const projectOwner = new Map<string, string>();
  for (const r of roles) for (const p of r.projects || []) projectOwner.set(p, r.id);
  for (const r of roles) {
    experiences.push({
      id: r.id,
      t: place(r.id, "work"),
      kind: "role",
      title: [str(r.title), str(r.org)].filter(Boolean).join(", "),
      start: str(r.start),
      end: r.current ? null : str(r.end) || str(r.start),
      desc: str(r.summary),
      bullets: (r.achievements || []).filter(Boolean),
      skills: [],
      include: true,
    });
  }

  /* Timeline entries: creations, milestones, learning, memories */
  const byCategory: Record<string, [string, string]> = {
    Creation: ["creations", "creation"],
    Milestone: ["milestones", "milestone"],
    Learning: ["learning", "study"],
    Memory: ["memories", "memory"],
  };
  for (const e of (snapshot.entries || []) as Entry[]) {
    if (e.public === false) continue;
    const [defArea, kind] = byCategory[e.category || ""] || ["other", "creation"];
    const domain = str(e.domain);
    const area = projectOwner.has(e.id) ? "work" : domain ? slug(domain) : defArea;
    const ongoing = e.status === "In progress" || e.status === "Evergreen";
    const media: Media[] = [];
    if (e.cover) media.push({ type: "image", src: e.cover, alt: "" });
    if (e.link) media.push({ type: "link", url: e.link, label: e.linkLabel || "Open link" });
    experiences.push({
      id: e.id,
      t: place(e.id, area, domain || undefined),
      kind: projectOwner.has(e.id) && kind === "creation" ? "project" : kind,
      title: str(e.title),
      start: str(e.date),
      end: ongoing ? null : str(e.date),
      desc: str(e.text),
      skills: e.tags || [],
      media,
      include: true,
    });
  }

  /* Music and books, kept small so the islands stay readable */
  const library = profile.media || {};
  for (const s of (library.songs || []).slice(0, 24)) {
    experiences.push({
      id: "song-" + s.id,
      t: place("song-" + s.id, "music"),
      kind: "creation",
      title: [str(s.title), str(s.artist)].filter(Boolean).join(" · "),
      start: "",
      end: "",
      desc: str(s.note),
      media: [
        ...(s.cover ? [{ type: "image" as const, src: s.cover, alt: "" }] : []),
        ...(s.link ? [{ type: "link" as const, url: s.link, label: "Listen" }] : []),
      ],
      include: true,
    });
  }
  const books = (library.books || []).filter((b) => b.public !== false);
  books.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  for (const b of books.slice(0, 24)) {
    experiences.push({
      id: "book-" + b.id,
      t: place("book-" + b.id, "reading"),
      kind: b.written ? "creation" : "study",
      title: str(b.title) + (b.author ? ", " + b.author : ""),
      start: str(b.year),
      end: b.status === "Reading" ? null : str(b.year),
      desc: str(b.note),
      media: b.cover ? [{ type: "image" as const, src: b.cover, alt: "" }] : [],
      include: true,
    });
  }

  /* Factual links the owner already entered: a role lists its projects. */
  for (const r of roles)
    for (const p of r.projects || [])
      connections.push({
        id: "role-" + r.id + "-" + p,
        from: r.id,
        to: p,
        rel: "includes",
        status: "confirmed",
        origin: "profile",
        note: "",
      });

  /* Subjective links only when the owner confirmed them. */
  for (const l of cfg.links || [])
    if (l.status === "confirmed")
      connections.push({
        id: l.id,
        from: l.from,
        to: l.to,
        rel: l.rel,
        status: "confirmed",
        origin: "owner",
        note: l.note || "",
      });

  /* Areas: owner settings first (order, names, estimates), then anything new. */
  const configured = new Map((cfg.areas || []).map((a) => [a.id, a]));
  const used = new Set(experiences.map((e) => e.t));
  const order = [
    ...(cfg.areas || []).map((a) => a.id),
    ...[...used].filter((id) => !configured.has(id)),
  ];
  const territories = order
    .filter((id, i, all) => all.indexOf(id) === i && used.has(id))
    .map((id) => {
      const a = configured.get(id);
      return {
        id,
        name: a?.name || areaNames.get(id) || id,
        include: a ? a.include !== false : true,
        soFar: a?.soFar || null,
        now: a?.now || null,
        blurb: a?.blurb || "",
      };
    })
    .filter((t) => t.include);

  const horizon = (cfg.horizon || []).map((h) => ({
    id: h.id,
    t: h.area,
    title: h.title,
    when: h.when || "",
  }));

  return {
    person: {
      name: str(profile.name) || "This person",
      title: str(profile.headline),
      beyond: str(profile.bio),
      now: str(cfg.now),
    },
    territories,
    experiences,
    connections,
    horizon,
  };
}
