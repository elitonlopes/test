#!/usr/bin/env python3
"""Apply the Constellation integration to a checkout of elitonlopes/in-the-making.

Usage: python3 apply.py /path/to/in-the-making

New files are copied from ./src. Existing files get small anchored edits; the script
stops with a clear message if an anchor is missing (i.e. the file changed upstream).
"""
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).parent
target = pathlib.Path(sys.argv[1])

for src in [*(HERE / "src").rglob("*"), *(HERE / "tests").rglob("*")]:
    if src.is_file():
        dst = target / src.relative_to(HERE)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        print("added  ", dst.relative_to(target))


def edit(rel, pairs):
    path = target / rel
    text = path.read_text()
    for old, new in pairs:
        if new in text:
            continue
        if old not in text:
            sys.exit(f"anchor not found in {rel}:\n{old}")
        text = text.replace(old, new, 1)
    path.write_text(text)
    print("edited ", rel)


# 1. Schema: keep the owner's Constellation settings, and publish only what visitors may see.
edit("src/features/life/state-schema.ts", [
    (
        "// Dates are kept as the person wrote them: a year alone stays a year.",
        '''// Constellation: rough time ranges per part of life, and owner-confirmed connections.
const itemRef = z
  .string()
  .min(1)
  .max(130)
  .regex(/^[a-zA-Z0-9_-]+$/);
const constellation = z.object({
  now: z.string().max(600).optional(),
  areas: z
    .array(
      z.object({
        id,
        name: z.string().max(60),
        soFar: z.enum(["lt100", "100-500", "500-2k", "2k-5k", "5k-10k", "10k-20k", "20k+"]).optional(),
        now: z.enum(["none", "lt1", "1-3", "3-6", "6-12", "12-25", "25-40", "40+"]).optional(),
        include: z.boolean().optional(),
        blurb: z.string().max(600).optional(),
      }),
    )
    .max(40)
    .optional(),
  assign: z.record(itemRef, id).optional(),
  links: z
    .array(
      z.object({
        id,
        from: itemRef,
        to: itemRef,
        rel: z.enum(["inspired", "developed", "led_to", "changed_direction", "fed_into", "shaped"]),
        note: z.string().max(400).optional(),
        status: z.enum(["confirmed", "suggested"]),
      }),
    )
    .max(500)
    .optional(),
  horizon: z
    .array(z.object({ id, area: id, title: z.string().max(160), when: z.string().max(60).optional() }))
    .max(20)
    .optional(),
});
// Dates are kept as the person wrote them: a year alone stays a year.''',
    ),
    (
        "  experience: z.array(experience).max(500).optional(),\n});",
        "  experience: z.array(experience).max(500).optional(),\n  constellation: constellation.optional(),\n});",
    ),
    (
        """    state.published.entries = state.published.entries
      .filter((e) => e.public)
      .map(({ journey, ...entry }) => entry);
  }""",
        """    state.published.entries = state.published.entries
      .filter((e) => e.public)
      .map(({ journey, ...entry }) => entry);
    state.published.profile = publicConstellation(state.published.profile, state.published.entries);
  }""",
    ),
    (
        "export function parseBackup(value: unknown) {",
        """/** Visitors only receive connections the owner confirmed, and only between published items,
 * so a connection's note can never reveal something private. */
export function publicConstellation(
  value: z.infer<typeof profile>,
  entries?: { id: string; public: boolean }[],
) {
  if (!value.constellation) return value;
  const visible = new Set<string>([
    ...(entries || []).filter((e) => e.public).map((e) => e.id),
    ...(value.experience || []).map((r) => r.id),
    ...(value.media?.songs || []).map((s) => "song-" + s.id),
    ...(value.media?.books || []).filter((b) => b.public !== false).map((b) => "book-" + b.id),
  ]);
  const links = (value.constellation.links || []).filter(
    (l) => l.status === "confirmed" && (!entries || (visible.has(l.from) && visible.has(l.to))),
  );
  return { ...value, constellation: { ...value.constellation, links } };
}

export function parseBackup(value: unknown) {""",
    ),
])

edit("src/features/life/state-schema.ts", [
    (
        """      });
  }
  return result;
}""",
        """      });
  }
  // Suggested connections are owner-only; checking both ends needs the entries (see parseState).
  return publicConstellation(result);
}""",
    ),
])

# 2. Public page: a way into the Constellation from the existing page.
edit("src/features/life/PublicPageView.tsx", [
    (
        "  banner,\n}: {",
        "  banner,\n  constellationHref,\n}: {",
    ),
    (
        '  banner?: "example";\n}) {',
        '  banner?: "example";\n  /** When set, links to this person\'s Constellation. */\n  constellationHref?: string;\n}) {',
    ),
    (
        """        <footer className="public-cta">
          <Link className="textbtn" to="/welcome">""",
        """        <footer className="public-cta">
          {constellationHref && (
            <a className="textbtn" href={constellationHref}>
              Explore as a Constellation →
            </a>
          )}
          <Link className="textbtn" to="/welcome">""",
    ),
])
edit("src/routes/u.$username.tsx", [
    (
        "      username={space.username}\n    />",
        "      username={space.username}\n      constellationHref={`/u/${space.username}/constellation`}\n    />",
    ),
])
print("done")
