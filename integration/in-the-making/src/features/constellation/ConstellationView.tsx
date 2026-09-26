import { useEffect, useRef } from "react";
import { mountConstellation } from "./engine.js";
import { snapshotToConstellation } from "./adapter";
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
    return mountConstellation(root.current, snapshotToConstellation(snapshot), {
      profileHref,
      storageKey,
      sample,
    });
  }, [snapshot, profileHref, storageKey, sample]);

  return (
    <div ref={root} className="constellation-app">
      <p className="cx-loading">Drawing the map…</p>
    </div>
  );
}
