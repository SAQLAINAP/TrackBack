#!/usr/bin/env node
/**
 * Scrape YouTube playlists into seed data and splice them into src/data/seed.ts.
 *
 * Deliberately additive: existing sections/courses/lessons are left untouched.
 * Re-scraping a playlist we already seeded would silently drop lessons whose
 * videos have since been deleted or made private, and those lessons may carry
 * the user's progress and notes.
 *
 * Usage: node scripts/scrape-playlists.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = resolve(ROOT, "src/data/seed.ts");
const DRY = process.argv.includes("--dry");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Sections to add, in display order after the existing four. */
const SECTIONS = [
  { slug: "lld", name: "Low Level Design", color: "#8b5cf6" },
  { slug: "networking", name: "Networking", color: "#10b981" },
  { slug: "kafka", name: "Kafka & Streaming", color: "#84cc16" },
  { slug: "distributed_systems", name: "Distributed Systems", color: "#ef4444" },
];

/** Courses to add. `expect` is the count I verified by hand — a mismatch aborts. */
const COURSES = [
  { id: "course_lld_shrayansh", sectionSlug: "lld", playlistId: "PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW", expect: 48 },
  { id: "course_lld_udit", sectionSlug: "lld", playlistId: "PL564gOx0bCLqTolRIHIsR2JPv11w8LESW", expect: 24 },
  { id: "course_net_engineering", sectionSlug: "networking", playlistId: "PLQnljOFTspQUBSgBXilKhRMJ1ACqr7pTr", expect: 62 },
  { id: "course_net_tls", sectionSlug: "networking", playlistId: "PLQnljOFTspQW4yHuqp_Opv853-G_wAiH-", expect: 31 },
  { id: "course_kafka_conduktor", sectionSlug: "kafka", playlistId: "PLYmXYyXCMsfMMhiKPw4k1FF7KWxOEajsA", expect: 32 },
  { id: "course_kafka_101", sectionSlug: "kafka", playlistId: "PLa7VYi0yPIH0KbnJQcMv5N9iW8HkZHztH", expect: 19 },
  { id: "course_dist_kleppmann", sectionSlug: "distributed_systems", playlistId: "PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB", expect: 23 },
  { id: "course_dist_mit6824", sectionSlug: "distributed_systems", playlistId: "PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB", expect: 20 },
];

/** "1:02:03" or "11:04" -> seconds. */
function hhmmssToSec(text) {
  return text
    .split(":")
    .map(Number)
    .reduce((acc, part) => acc * 60 + part, 0);
}

async function fetchPlaylist(playlistId) {
  const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${playlistId}`);
  const html = await res.text();

  const m = html.match(/ytInitialData\s*=\s*(\{.*?\});<\/script>/s);
  if (!m) throw new Error(`no ytInitialData for ${playlistId}`);
  const data = JSON.parse(m[1]);

  const title =
    (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").replace(" - YouTube", "").trim();

  const videos = [];
  const skipped = [];
  const add = (vid, vtitle, secs) => {
    // Private/deleted entries keep their slot in the playlist but have no
    // duration and an unusable title — they'd become dead, unplayable lessons.
    if (vid && vtitle && Number.isFinite(secs) && secs > 0) {
      videos.push({ videoId: vid, title: vtitle, durationSec: secs });
    } else {
      skipped.push(vid ?? "?");
    }
  };

  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;

    // Legacy layout: duration is a plain lengthSeconds field.
    const r = node.playlistVideoRenderer;
    if (r) {
      add(r.videoId, r.title?.runs?.[0]?.text ?? r.title?.simpleText, Number(r.lengthSeconds));
    }

    // Current layout: duration only exists as "12:34" overlay text.
    const vm = node.lockupViewModel;
    if (vm && vm.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const badge =
        vm.contentImage?.thumbnailViewModel?.overlays
          ?.flatMap((o) => o.thumbnailBottomOverlayViewModel?.badges ?? [])
          .map((b) => b.thumbnailBadgeViewModel?.text)
          .find((t) => /^\d+:\d{2}(:\d{2})?$/.test(t ?? "")) ?? null;
      add(
        vm.contentId,
        vm.metadata?.lockupMetadataViewModel?.title?.content,
        badge ? hhmmssToSec(badge) : NaN,
      );
    }

    for (const k in node) walk(node[k]);
  })(data);

  return { title, videos, skipped };
}

const esc = (s) => JSON.stringify(s);

const out = { sections: [], courses: [], lessons: [] };
let order = 4; // existing sections occupy 0..3
for (const s of SECTIONS) {
  out.sections.push({ slug: s.slug, name: s.name, color: s.color, order: order++ });
}

const seen = new Set();
for (const [i, c] of COURSES.entries()) {
  const { title, videos, skipped } = await fetchPlaylist(c.playlistId);
  const note = skipped.length ? `  (skipped ${skipped.length} private/deleted)` : "";
  console.log(`${String(videos.length).padStart(3)} / ${c.expect} expected | ${title}${note}`);
  if (!videos.length) throw new Error(`${c.playlistId} yielded no videos`);
  // A big swing means the playlist changed materially since I verified it.
  if (Math.abs(videos.length - c.expect) > 3) {
    throw new Error(
      `${c.id}: got ${videos.length} videos, expected ~${c.expect}. Re-verify before seeding.`,
    );
  }

  const perSection = COURSES.filter((x) => x.sectionSlug === c.sectionSlug);
  out.courses.push({
    id: c.id,
    sectionSlug: c.sectionSlug,
    title,
    playlistId: c.playlistId,
    sourceUrl: `https://youtube.com/playlist?list=${c.playlistId}`,
    order: perSection.indexOf(c),
  });

  videos.forEach((v, idx) => {
    // Lesson ids are derived from the videoId, so a video appearing in two
    // playlists would collide and silently overwrite the first.
    if (seen.has(v.videoId)) {
      console.warn(`  ! duplicate videoId ${v.videoId} — skipping in ${c.id}`);
      return;
    }
    seen.add(v.videoId);
    out.lessons.push({
      id: `l_${v.videoId}`,
      courseId: c.id,
      videoId: v.videoId,
      title: v.title,
      durationSec: v.durationSec,
      order: idx,
    });
  });
  void i;
}

const hours = (out.lessons.reduce((a, l) => a + l.durationSec, 0) / 3600).toFixed(1);
console.log(
  `\n${out.sections.length} sections, ${out.courses.length} courses, ` +
    `${out.lessons.length} lessons, ${hours}h`,
);

if (DRY) process.exit(0);

// ---- splice into seed.ts ----
let src = readFileSync(SEED, "utf8");

const existingIds = new Set(src.match(/id:"(l_[\w-]+)"/g)?.map((s) => s.slice(4, -1)) ?? []);
const collisions = out.lessons.filter((l) => existingIds.has(l.id));
if (collisions.length) {
  // These videos are already seeded under another course; re-adding them would
  // move the existing lesson and take its progress with it.
  console.warn(`! ${collisions.length} lessons already exist and were dropped:`);
  collisions.forEach((l) => console.warn(`  ${l.id} ${l.title.slice(0, 60)}`));
  out.lessons = out.lessons.filter((l) => !existingIds.has(l.id));
}

function insertBefore(text, marker, addition) {
  const i = text.lastIndexOf(marker);
  if (i < 0) throw new Error(`marker not found: ${marker}`);
  return text.slice(0, i) + addition + text.slice(i);
}

// seedSections is a single-line JSON array.
src = src.replace(
  /(export const seedSections: SeedSection\[\] = \[)(.*)(\];)/,
  (_m, a, body, z) =>
    a + body + "," + out.sections.map((s) => JSON.stringify(s)).join(",") + z,
);

src = insertBefore(
  src,
  "\n];\n\nexport const seedLessons",
  ",\n" +
    out.courses
      .map(
        (c) =>
          `  { id:${esc(c.id)}, sectionSlug:${esc(c.sectionSlug)}, title:${esc(c.title)}, ` +
          `playlistId:${esc(c.playlistId)}, sourceUrl:${esc(c.sourceUrl)}, order:${c.order} }`,
      )
      .join(",\n"),
);

src = insertBefore(
  src,
  "\n];\n\nexport const SEED_VERSION",
  ",\n" +
    out.lessons
      .map(
        (l) =>
          `  { id:${esc(l.id)}, courseId:${esc(l.courseId)}, videoId:${esc(l.videoId)}, ` +
          `title:${esc(l.title)}, durationSec:${l.durationSec}, order:${l.order} }`,
      )
      .join(",\n"),
);

// Bumping the version re-runs seeding on existing installs. Safe: it bulkPuts
// only sections/courses/lessons and never touches progress/notes/flairs/media.
src = src.replace(/export const SEED_VERSION = (\d+);/, (_m, v) => {
  console.log(`\nSEED_VERSION ${v} -> ${Number(v) + 1}`);
  return `export const SEED_VERSION = ${Number(v) + 1};`;
});

writeFileSync(SEED, src);
console.log(`wrote ${SEED}`);
