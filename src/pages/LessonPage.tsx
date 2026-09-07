import { useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import YouTube, { type YouTubeEvent } from "react-youtube";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useLesson, useLessons, useProgressMap, useLessonFlairs } from "../lib/queries";
import { setStatus, toggleFlair, addMedia } from "../lib/repo";
import { Card, Button, Segmented } from "../components/ui";
import { FlairChip } from "../components/FlairChip";
import { NotesEditor } from "../components/NotesEditor";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { MediaGallery } from "../components/MediaGallery";
import { IconArrowLeft, IconArrowRight, IconCheck, IconImage } from "../components/icons";
import { FLAIRS, type LessonStatus } from "../lib/types";
import { fmtDateTime } from "../lib/format";

export function LessonPage() {
  const { lessonId } = useParams();
  const lesson = useLesson(lessonId);
  const course = useLiveQuery(
    () => (lesson ? db.courses.get(lesson.courseId) : undefined),
    [lesson?.courseId],
  );
  const siblings = useLessons(lesson?.courseId);
  const pmap = useProgressMap();
  const flairs = useLessonFlairs(lessonId);
  const fileRef = useRef<HTMLInputElement>(null);

  const { prev, next } = useMemo(() => {
    const idx = siblings.findIndex((l) => l.id === lessonId);
    return { prev: siblings[idx - 1], next: siblings[idx + 1] };
  }, [siblings, lessonId]);

  if (!lesson) return <div className="text-ink-faint">Loading…</div>;

  const prog = pmap.get(lesson.id);
  const status: LessonStatus = prog?.status ?? "not_started";

  const onPlay = () => {
    if (status === "not_started") setStatus(lesson.id, "in_progress");
  };
  const onEnd = (_e: YouTubeEvent) => {
    setStatus(lesson.id, "completed");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) await addMedia(lesson.id, "image", f);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link
        to={`/course/${lesson.courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint dark:text-zinc-500 hover:text-ink dark:hover:text-white transition max-w-full"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        <span className="truncate">{course?.title ?? "Course"}</span>
      </Link>

      <h1 className="font-display text-[21px] sm:text-[26px] font-bold tracking-tight leading-snug text-ink dark:text-white">
        {lesson.title}
      </h1>

      {/* Player */}
      <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] bg-black aspect-video shadow-soft dark:shadow-glow">
        <YouTube
          videoId={lesson.videoId}
          onPlay={onPlay}
          onEnd={onEnd}
          className="h-full w-full"
          iframeClassName="h-full w-full"
          opts={{ width: "100%", height: "100%", playerVars: { rel: 0, modestbranding: 1 } }}
        />
      </div>

      {/* Status — equal-width segments so nothing wraps or looks lopsided */}
      <Card className="p-3 sm:p-4 space-y-3">
        <Segmented<LessonStatus>
          value={status}
          onChange={(v) => setStatus(lesson.id, v)}
          options={[
            { value: "not_started", label: "Not started" },
            { value: "in_progress", label: "In progress" },
            {
              value: "completed",
              label: (
                <>
                  <IconCheck size={15} />
                  Completed
                </>
              ),
            },
          ]}
        />
        {status === "completed" && prog?.completedAt && (
          <p className="text-xs text-center text-ink-faint dark:text-zinc-500">
            Completed {fmtDateTime(prog.completedAt)} · auto-dated
          </p>
        )}
      </Card>

      {/* Flairs */}
      <Card className="p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display font-semibold text-[15px]">Flairs</h3>
          <span className="text-xs text-ink-faint dark:text-zinc-500">
            {flairs.size > 0 ? `${flairs.size} selected` : "Tap to tag"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FLAIRS.map((f) => (
            <FlairChip
              key={f.kind}
              kind={f.kind}
              active={flairs.has(f.kind)}
              onClick={() => toggleFlair(lesson.id, f.kind)}
            />
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-4">
        <NotesEditor lessonId={lesson.id} />
      </Card>

      {/* Attachments */}
      <Card className="p-4 space-y-4">
        <h3 className="font-display font-semibold text-[15px]">Attachments</h3>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        {/* Two equal columns — identical height, single-line labels */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" full onClick={() => fileRef.current?.click()}>
            <IconImage size={17} />
            Image
          </Button>
          <VoiceRecorder lessonId={lesson.id} />
        </div>

        <MediaGallery lessonId={lesson.id} />
      </Card>

      {/* Prev / Next */}
      <div className="grid grid-cols-2 gap-3">
        {prev ? (
          <Link
            to={`/lesson/${prev.id}`}
            className="group flex items-center gap-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition min-w-0"
          >
            <IconArrowLeft size={16} className="shrink-0 text-ink-faint dark:text-zinc-500" />
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-ink-faint dark:text-zinc-500">
                Previous
              </span>
              <span className="block text-[13px] truncate text-ink-soft dark:text-zinc-300">
                {prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/lesson/${next.id}`}
            className="group flex items-center justify-end gap-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.07] p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition min-w-0 text-right"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-ink-faint dark:text-zinc-500">
                Next
              </span>
              <span className="block text-[13px] truncate text-ink-soft dark:text-zinc-300">
                {next.title}
              </span>
            </span>
            <IconArrowRight size={16} className="shrink-0 text-ink-faint dark:text-zinc-500" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
