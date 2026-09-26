import { createFileRoute } from "@tanstack/react-router";
import { ConstellationView } from "@/features/constellation/ConstellationView";
import { constellationHeadLinks } from "@/features/constellation/head";
import { CONSTELLATION_EXAMPLE_SNAPSHOT } from "@/features/constellation/example-data";

const description =
  "An example Constellation: one person's life as an atlas of work, interests, creations and connections.";

export const Route = createFileRoute("/example_/constellation")({
  head: () => ({
    meta: [
      { title: "Example Constellation — EverAtlas" },
      { name: "description", content: description },
      { property: "og:title", content: "Example Constellation — EverAtlas" },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
    ],
    links: constellationHeadLinks,
  }),
  component: () => (
    <ConstellationView snapshot={CONSTELLATION_EXAMPLE_SNAPSHOT} storageKey="example" sample />
  ),
});
