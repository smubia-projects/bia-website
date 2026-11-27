import "@tests/helpers/db";
import "@tests/helpers/next-cache";
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { cohorts } from "@/server/db/schema";
import { canonicalPath } from "@/shared/canonical-path";
import { FEED_VERSION, getAILodgeFeed } from "@/server/ailodge/feed";
import * as lodges from "@/server/ailodge/lodges";
import { proxy } from "@/proxy";
import { actorFor } from "@tests/helpers/actors";

/** Every key path in a value ("semesters[].lodges[].name"), so a renamed or removed field shows up. */
function shape(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.length ? [...new Set(value.flatMap((v) => shape(v, `${prefix}[]`)))] : [`${prefix}[]`];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [`${prefix}${prefix ? "." : ""}${k}`, ...shape(v, `${prefix}${prefix ? "." : ""}${k}`)]);
  }
  return [];
}

before(async () => {
  const db = await getDb();
  await db.insert(cohorts).values({ id: "ai-lodge-s1", programme: "AI Lodge", slug: "s1", name: "S1", visibility: "live" });
  await lodges.saveLodge(actorFor("exco"), { cohortId: "ai-lodge-s1", name: "Alpha" });
});

const FEED_KEYS = [
  "version",
  "generatedAt",
  "applications",
  "applications.open",
  "applications.url",
  "applications.formUrl",
  "applications.telegramUrl",
  "links",
  "links.site",
  "links.smubia",
  "links.projects",
  "links.telegram",
  "semester",
  "semester.slug",
  "semester.name",
  "semester.shortName",
  "semester.status",
  "semester.revealNote",
  "semester.hackDay",
  "semester.timeline",
  "semester.timeline[]",
  "semester.projectsUrl",
  "semester.lodges",
  "semester.lodges[].slug",
  "semester.lodges[].path",
  "semester.lodges[].oldSlugs",
  "semester.lodges[].oldSlugs[]",
  "semester.lodges[].placeholder",
  "semester.lodges[].name",
  "semester.lodges[].motto",
  "semester.lodges[].tagline",
  "semester.lodges[].level",
  "semester.lodges[].whoCanJoin",
  "semester.lodges[].forWho",
  "semester.lodges[].forWhoCard",
  "semester.lodges[].why",
  "semester.lodges[].topics",
  "semester.lodges[].topics[]",
  "semester.lodges[].cardTags",
  "semester.lodges[].cardTags[]",
  "semester.lodges[].goals",
  "semester.lodges[].goals[]",
  "semester.lodges[].schedule",
  "semester.lodges[].schedule.text",
  "semester.lodges[].schedule.short",
  "semester.lodges[].schedule.tentative",
  "semester.lodges[].sessionLength",
  "semester.lodges[].weeks",
  "semester.lodges[].weeks[]",
  "semester.lodges[].trailTentative",
  "semester.lodges[].weeksNote",
  "semester.lodges[].captains",
  "semester.lodges[].captains[]",
  "semester.lodges[].applications",
  "semester.lodges[].applications.takesApplications",
  "semester.lodges[].applications.status",
  "semester.lodges[].applications.applyUrl",
  "semester.lodges[].art",
  "semester.lodges[].art.logo",
  "semester.lodges[].art.logoStyle",
  "semester.lodges[].art.emblem",
  "semester.lodges[].art.accent",
  "semester.lodges[].art.neonColor",
  "semester.lodges[].art.neonSign",
  "semester.lodges[].art.ambient",
  "semester.lodges[].art.ambientImage",
  "semester.lodges[].art.ambientGlow",
  "semester.lodges[].art.hero",
  "semester.lodges[].art.hero.kind",
  "semester.lodges[].art.hero.showpiece",
  "semester.lodges[].art.hero.image",
  "semester.lodges[].art.hero.glow",
  "semester.lodges[].art.hero.particles",
  "semester.lodges[].art.hero.float",
  "semester.lodges[].art.watermark",
  "semester.lodges[].art.belt",
  "semester.lodges[].art.belt.mode",
  "semester.lodges[].art.belt.image",
  "semester.lodges[].art.belt.speed",
  "semester.lodges[].art.belt.size",
  "past",
  "past[]",
  "photos",
  "photos.entry",
  "photos.entryPortrait",
  "photos.lodgeHero",
  "photos.hero",
  "photos.whyJoin",
  "photos.moments",
];

describe("public AI Lodge feed contract", () => {
  it(`is version ${FEED_VERSION}, with every field the AI Lodge site reads`, async () => {
    assert.equal(FEED_VERSION, 2, "bump FEED_VERSION and update docs/handoffs/ailodge-site-handoff.md before renaming or removing a field");
    const feed = await getAILodgeFeed();
    // The whole contract, as the AI Lodge site reads it. Adding a field means adding it here;
    // removing or renaming one needs a FEED_VERSION bump first.
    assert.deepEqual([...new Set(shape(feed))].sort(), [...FEED_KEYS].sort());
  });
});

describe("redirects", () => {
  const CASES: [string, string | null, string][] = [
    ["/DAP", null, "/dap"],
    ["/Projects", null, "/projects"],
    ["/Projects/ScamSense", null, "/projects/scamsense"],
    ["/WorkWithUs", null, "/work-with-us"],
    ["/workwithus", null, "/work-with-us"],
    ["/ContactUs", null, "/contact-us"],
    ["/Curriculum", null, "/curriculum"],
    ["/projects/ai-lodge", null, "/projects/ailodge"],
    ["/projects/ai-lodge/s1/x", null, "/projects/ailodge/s1/x"],
    ["/Projects", "AI Lodge", "/projects/ailodge"],
    ["/projects", "DAP", "/projects/dap"],
  ];

  it("send legacy paths to the canonical one, which never redirects again", () => {
    for (const [from, badge, to] of CASES) {
      assert.equal(canonicalPath(from, badge), to, from);
      assert.equal(canonicalPath(to, null), to, `${to} would loop`);
    }
  });

  it("the proxy answers one 308 hop and passes canonical paths through", () => {
    const hop = proxy(new NextRequest("http://localhost/Projects?badge=DAP"));
    assert.equal(hop.status, 308);
    assert.equal(new URL(hop.headers.get("location")!).pathname, "/projects/dap");
    assert.equal(new URL(hop.headers.get("location")!).search, "");
    const pass = proxy(new NextRequest("http://localhost/projects/dap"));
    assert.equal(pass.headers.get("location"), null);
  });
});
