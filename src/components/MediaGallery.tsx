import { useEffect, useState } from "react";
import { useLessonMedia } from "../lib/queries";
import { deleteMedia } from "../lib/repo";
import { ensureMediaBlob } from "../lib/sync";
import type { MediaItem } from "../lib/types";

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
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="note attachment" className="h-full w-full object-cover" />
        </a>
      ) : (
        <div className="h-full w-full grid place-items-center text-xs text-ink-faint">…</div>
      )}
      <button
        onClick={() => deleteMedia(item.id)}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

function AudioRow({ item }: { item: MediaItem }) {
  const url = useObjectUrl(item);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2">
      {url ? (
        <audio controls src={url} className="h-8 flex-1" />
      ) : (
        <span className="text-xs text-ink-faint flex-1">Loading audio…</span>
      )}
      <button
        onClick={() => deleteMedia(item.id)}
        className="text-ink-faint hover:text-rose-500 text-sm"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
