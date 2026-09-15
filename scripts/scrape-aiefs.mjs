#!/usr/bin/env node
/**
 * Rebuild src/data/aiEngineering.ts from https://aiengineeringfromscratch.com/data.js.
 *
 * The catalog is fetched once per run and its `PHASES` literal is extracted
 * with a slice — the file is data-only JSON wrapped in `const PHASES = […];`,
 * so `new Function` evaluation is safe and simpler than a full JS parser.
 *
 * Each PHASE becomes a Course, each lesson within a phase becomes a Lesson
 * with `videoId: null` + `externalUrl` (the GitHub folder). Every course is
 * marked `beta: true` so the UI surfaces the "Beta" chip and the LessonPage
 * renders an external-link card instead of the YouTube player.
 *
 * IDs are stable across runs (`course_aiefs_<phase-slug>` /
 * `l_aiefs_<phase-slug>_<lesson-slug>`), so re-running is a safe upsert: user
 * progress/notes/flairs — keyed on lessonId — survive.
 *
 * Usage: node scripts/scrape-aiefs.mjs [--dry]
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/aiEngineering.ts");
const DRY = process.argv.includes("--dry");
const SRC = "https://aiengineeringfromscratch.com/data.js";
const GH_ROOT = "https://github.com/rohitg00/ai-engineering-from-scratch/tree/main/phases";

/** kebab-case slug matching the catalog's own URL scheme. */
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Two-digit phase prefix so "phase 09" sorts before "phase 10". */
function pad2(n) {
  return String(n).padStart(2, "0");
}

async function main() {
  const res = await fetch(SRC, { headers: { "user-agent": "trackback-scraper" } });
  if (!res.ok) throw new Error(`GET ${SRC} -> ${res.status}`);
  const src = await res.text();

  // Isolate the `const PHASES = […];` literal. Anchor on the opening `[` after
  // the identifier so the RHS of unrelated arrays elsewhere in the file can't
  // hijack the match.
  const start = src.indexOf("const PHASES");
  if (start < 0) throw new Error("PHASES declaration not found");
  const bracket = src.indexOf("[", start);
  if (bracket < 0) throw new Error("PHASES bracket not found");

  // Walk the bracket depth so a `]` inside a string doesn't cut us short.
  let depth = 0;
  let inStr = false;
  let strCh = "";
  let end = -1;
  for (let i = bracket; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error("PHASES literal did not close");

  const literal = src.slice(bracket, end);
  // eslint-disable-next-line no-new-func
  const phases = new Function(`return (${literal});`)();

  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error("PHASES parsed empty");
  }

  const courses = [];
  const lessons = [];
  let totalLessons = 0;

  for (const phase of phases) {
    const phaseSlug = `${pad2(phase.id)}-${slugify(phase.name)}`;
    const courseId = `course_aiefs_${pad2(phase.id)}_${slugify(phase.name).replace(/-/g, "_")}`;
    courses.push({
      id: courseId,
      sectionSlug: "ai_engineering",
      title: `Phase ${pad2(phase.id)} · ${phase.name}`,
      playlistId: null,
      sourceUrl: `${GH_ROOT}/${phaseSlug}`,
      order: phase.id,
      beta: true,
    });

    (phase.lessons ?? []).forEach((lesson, i) => {
      const lessonSlug = slugify(lesson.name);
      lessons.push({
        id: `l_aiefs_${pad2(phase.id)}_${lessonSlug}`,
        courseId,
        videoId: null,
        title: lesson.name,
        durationSec: 0,
        order: i,
        externalUrl: lesson.url,
        lang: lesson.lang && lesson.lang !== "—" ? lesson.lang : undefined,
        kind: lesson.type || undefined,
        summary: lesson.summary || undefined,
      });
      totalLessons++;
    });
  }

  // Emit as a single-line-per-row TS module — keeps diffs readable and
  // matches the aesthetic of the existing seed.ts.
  const header = `// AUTO-GENERATED from ${SRC.replace("/data.js", "/catalog.html")}
// Source of truth: data.js#PHASES from that site. Regenerate with scripts/scrape-aiefs.mjs.
// Non-YouTube course: every lesson has an externalUrl (GitHub folder) and no videoId
// or duration, so LessonPage renders an "Open on GitHub" card instead of a player.

import type { SeedCourse, SeedLesson } from "./seed";

export const AI_ENGINEERING_SECTION = {
  slug: "ai_engineering",
  name: "AI Engineering",
  color: "#3553ff",
  order: 8,
} as const;

`;

  const fmtCourse = (c) =>
    `  { id:${JSON.stringify(c.id)}, sectionSlug:${JSON.stringify(c.sectionSlug)}, title:${JSON.stringify(
      c.title,
    )}, playlistId:${c.playlistId === null ? "null" : JSON.stringify(c.playlistId)}, sourceUrl:${JSON.stringify(
      c.sourceUrl,
    )}, order:${c.order}, beta:true }`;

  const fmtLesson = (l) => {
    const opt = (k, v) => (v === undefined ? "" : `, ${k}:${JSON.stringify(v)}`);
    return `  { id:${JSON.stringify(l.id)}, courseId:${JSON.stringify(l.courseId)}, videoId:null, title:${JSON.stringify(
      l.title,
    )}, durationSec:${l.durationSec}, order:${l.order}${opt("externalUrl", l.externalUrl)}${opt(
      "lang",
      l.lang,
    )}${opt("kind", l.kind)}${opt("summary", l.summary)} }`;
  };

  const body =
    header +
    "export const seedAiEngineeringCourses: SeedCourse[] = [\n" +
    courses.map(fmtCourse).join(",\n") +
    "\n];\n\n" +
    "export const seedAiEngineeringLessons: SeedLesson[] = [\n" +
    lessons.map(fmtLesson).join(",\n") +
    "\n];\n";

  console.log(
    `Parsed ${phases.length} phases → ${courses.length} courses, ${totalLessons} lessons.`,
  );
  console.log(
    `Phase counts: ${phases.map((p) => `${pad2(p.id)}:${p.lessons?.length ?? 0}`).join(" ")}`,
  );

  if (DRY) {
    console.log(`(dry run) would write ${body.length} bytes to ${OUT}`);
    return;
  }

  writeFileSync(OUT, body, "utf8");
  console.log(`Wrote ${body.length} bytes to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
