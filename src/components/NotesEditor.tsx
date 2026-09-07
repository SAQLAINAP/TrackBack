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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Notes</h3>
        <div className="flex items-center gap-3 text-xs text-ink-faint dark:text-zinc-500">
          <span>{saved ? "Saved" : "Saving…"}</span>
          <button
            onClick={() => setPreview((p) => !p)}
            className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="prose-notes min-h-[8rem] rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-[15px]">
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
          className="w-full min-h-[10rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent p-3 text-[15px] font-mono outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-y"
        />
      )}
    </div>
  );
}
