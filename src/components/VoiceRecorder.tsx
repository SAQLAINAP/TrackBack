import { useRef, useState } from "react";
import { addMedia } from "../lib/repo";
import { Button } from "./ui";

export function VoiceRecorder({ lessonId }: { lessonId: string }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        await addMedia(lessonId, "audio", blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      rec.current = mr;
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone unavailable");
    }
  };

  const stop = () => {
    rec.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  };

  return (
    <div className="flex items-center gap-3">
      {recording ? (
        <Button variant="danger" size="sm" onClick={stop}>
          ■ Stop · {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={start}>
          🎙️ Record voice note
        </Button>
      )}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
