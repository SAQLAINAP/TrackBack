import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveNote } from "../lib/repo";
import { useNote } from "../lib/queries";

export function NotesEditor({ lessonId }: { lessonId: string }) {
  const note = useNote(lessonId);
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const loadedFor = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load note text when lesson changes / first arrives
  useEffect(() => {
    if (note !== undefined && loadedFor.current !== lessonId) {
      setValue(note?.markdown ?? "");
      loadedFor.current = lessonId;
      setSaved(true);
    }
  }, [note, lessonId]);

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveNote(lessonId, v);
      setSaved(true);
    }, 600);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-semibold text-[15px]">Notes</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-ink-faint dark:text-zinc-500 tabular-nums">
            {saved ? "Saved" : "Saving…"}
          </span>
          <button
            onClick={() => setPreview((p) => !p)}
            className="h-8 rounded-lg px-3 text-xs font-medium border border-black/[0.08] dark:border-white/[0.12] text-ink-soft dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.07] active:scale-[0.96] transition"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="prose-notes min-h-[10rem] rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-3.5 text-[15px]">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <span className="text-ink-faint dark:text-zinc-600">Nothing yet.</span>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write notes in Markdown… code blocks, lists, links all supported."
          className="w-full min-h-[10rem] rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-3.5 text-[14px] leading-relaxed font-mono outline-none transition focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.05] resize-y placeholder:text-ink-faint dark:placeholder:text-zinc-600"
        />
      )}
    </div>
  );
}
