import { useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import YouTube, { type YouTubeEvent } from "react-youtube";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useLesson, useLessons, useProgressMap, useLessonFlairs } from "../lib/queries";
import { setStatus, toggleComplete, toggleFlair, addMedia } from "../lib/repo";
import { Card, Button } from "../components/ui";
import { FlairChip } from "../components/FlairChip";
import { NotesEditor } from "../components/NotesEditor";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { MediaGallery } from "../components/MediaGallery";
import { FLAIRS } from "../lib/types";
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
  const status = prog?.status ?? "not_started";

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
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-faint dark:text-zinc-500">
        <Link to={`/course/${lesson.courseId}`} className="hover:text-ink dark:hover:text-white truncate">
          ← {course?.title ?? "Course"}
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">{lesson.title}</h1>

      {/* Player */}
      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black aspect-video">
        <YouTube
          videoId={lesson.videoId}
          onPlay={onPlay}
          onEnd={onEnd}
          className="h-full w-full"
          iframeClassName="h-full w-full"
          opts={{ width: "100%", height: "100%", playerVars: { rel: 0, modestbranding: 1 } }}
        />
      </div>

      {/* Status row */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Button variant={status === "completed" ? "primary" : "outline"} onClick={() => toggleComplete(lesson.id)}>
          {status === "completed" ? "✓ Completed" : "Mark complete"}
        </Button>
        {status !== "completed" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatus(lesson.id, status === "in_progress" ? "not_started" : "in_progress")}
          >
            {status === "in_progress" ? "In progress" : "Mark in progress"}
          </Button>
        )}
        {status === "completed" && prog?.completedAt && (
          <span className="text-sm text-ink-faint dark:text-zinc-500">
            Completed {fmtDateTime(prog.completedAt)} · auto-dated
          </span>
        )}
      </Card>

      {/* Flairs */}
      <div>
        <h3 className="font-medium mb-2">Flairs</h3>
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
      </div>

      {/* Notes */}
      <Card className="p-4">
        <NotesEditor lessonId={lesson.id} />
      </Card>

      {/* Attachments */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Attachments</h3>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              🖼️ Add image
            </Button>
            <VoiceRecorder lessonId={lesson.id} />
          </div>
        </div>
        <MediaGallery lessonId={lesson.id} />
      </Card>

      {/* Prev / Next */}
      <div className="flex items-center justify-between pt-2">
        {prev ? (
          <Link
            to={`/lesson/${prev.id}`}
            className="text-sm text-ink-soft dark:text-zinc-400 hover:text-ink dark:hover:text-white max-w-[45%] truncate"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/lesson/${next.id}`}
            className="text-sm text-right text-ink-soft dark:text-zinc-400 hover:text-ink dark:hover:text-white max-w-[45%] truncate"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
