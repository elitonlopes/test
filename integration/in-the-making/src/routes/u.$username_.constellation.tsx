import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ConstellationView } from "@/features/constellation/ConstellationView";
import { constellationHeadLinks } from "@/features/constellation/head";
import { getPublicSpace } from "@/lib/public-space.functions";

export const Route = createFileRoute("/u/$username_/constellation")({
  loader: async ({ params }) => {
    const space = await getPublicSpace({ data: { username: params.username } });
    if (!space?.snapshot) throw notFound();
    return space;
  },
  head: ({ loaderData }) => {
    const profile = loaderData?.snapshot?.profile as
      { name?: string; headline?: string } | undefined;
    const name = profile?.name || loaderData?.username || "A person";
    const description = `Explore ${name}'s life as an atlas: work, interests, creations and what comes next.`;
    return {
      meta: [
        { title: `${name} · Constellation — EverAtlas` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} · Constellation — EverAtlas` },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
      ],
      links: constellationHeadLinks,
    };
  },
  notFoundComponent: () => (
    <div className="life-app public-page-mode">
      <main id="app">
        <section className="account-panel">
          <h1>No page here yet</h1>
          <p>This link is not in use, or the page has not been published.</p>
          <Link className="btn" to="/">
            Go to EverAtlas
          </Link>
        </section>
      </main>
    </div>
  ),
  component: PublicConstellation,
});

function PublicConstellation() {
  const space = Route.useLoaderData();
  return (
    <ConstellationView
      snapshot={space.snapshot as { profile: unknown; entries: unknown[] }}
      profileHref={`/u/${space.username}`}
      storageKey={space.username}
    />
  );
}
