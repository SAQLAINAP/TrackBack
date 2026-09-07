import { useEffect, useState } from "react";
import { useLessonMedia } from "../lib/queries";
import { deleteMedia } from "../lib/repo";
import { ensureMediaBlob } from "../lib/sync";
import type { MediaItem } from "../lib/types";
import { IconTrash } from "./icons";

export function MediaGallery({ lessonId }: { lessonId: string }) {
  const media = useLessonMedia(lessonId);
  const images = media.filter((m) => m.kind === "image");
  const audios = media.filter((m) => m.kind === "audio");

  if (media.length === 0) return null;

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((m) => (
            <ImageThumb key={m.id} item={m} />
          ))}
        </div>
      )}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((m) => (
            <AudioRow key={m.id} item={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function useObjectUrl(item: MediaItem): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let current: string | null = null;
    (async () => {
      let blob = item.blob;
      if (!blob) blob = await ensureMediaBlob(item.id);
      if (blob && !revoked) {
        current = URL.createObjectURL(blob);
        setUrl(current);
      }
    })();
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [item.id, item.blob]);
  return url;
}

function ImageThumb({ item }: { item: MediaItem }) {
  const url = useObjectUrl(item);
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.04]">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="note attachment" className="h-full w-full object-cover" />
        </a>
      ) : (
        <div className="h-full w-full grid place-items-center text-xs text-ink-faint">…</div>
      )}
      {/* Always visible — touch devices have no hover state. */}
      <button
        onClick={() => deleteMedia(item.id)}
        className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-black/55 backdrop-blur text-white active:scale-90 transition"
        aria-label="Delete image"
      >
        <IconTrash size={14} />
      </button>
    </div>
  );
}

function AudioRow({ item }: { item: MediaItem }) {
  const url = useObjectUrl(item);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] pl-2.5 pr-1.5 py-2">
      {url ? (
        <audio controls src={url} className="h-8 min-w-0 flex-1" />
      ) : (
        <span className="text-xs text-ink-faint flex-1">Loading audio…</span>
      )}
      <button
        onClick={() => deleteMedia(item.id)}
        className="h-9 w-9 shrink-0 grid place-items-center rounded-xl text-ink-faint hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition"
        aria-label="Delete recording"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}
