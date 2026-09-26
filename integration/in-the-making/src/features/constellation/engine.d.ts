import type { ConstellationData } from "./adapter";

export type MountOptions = {
  /** Link back to the person's regular page. */
  profileHref?: string | undefined;
  /** Scopes per-visitor "new since your last visit" memory. */
  storageKey?: string | undefined;
  /** Shows the "Example · fictional person" badge. */
  sample?: boolean | undefined;
};

export function mountConstellation(
  root: HTMLElement,
  data: ConstellationData,
  options?: MountOptions,
): () => void;
export const EA: Record<string, unknown>;
