import { useEffect, useRef } from "react";
import { mountConstellation } from "./engine.js";
import { snapshotToConstellation } from "./adapter";
import constellationCss from "./constellation.css?url";

/** Stylesheet and fonts for routes that render the Constellation. */
export const constellationHeadLinks = [
  { rel: "stylesheet", href: constellationCss },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap",
  },
];

export function ConstellationView({
  snapshot,
  profileHref,
  storageKey,
  sample,
}: {
  snapshot: { profile: unknown; entries: unknown[] };
  profileHref?: string;
  storageKey?: string;
  sample?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    return mountConstellation(root.current, snapshotToConstellation(snapshot), { profileHref, storageKey, sample });
  }, [snapshot, profileHref, storageKey, sample]);

  return (
    <div ref={root} className="constellation-app">
      <p className="cx-loading">Drawing the map…</p>
    </div>
  );
}
