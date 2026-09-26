import type { ConstellationData } from "./adapter";

export type MountOptions = {
  /** Link back to the person's regular page. */
  profileHref?: string;
  /** Scopes per-visitor "new since your last visit" memory. */
  storageKey?: string;
  /** Shows the "Example · fictional person" badge. */
  sample?: boolean;
};

export function mountConstellation(root: HTMLElement, data: ConstellationData, options?: MountOptions): () => void;
export const EA: Record<string, unknown>;
