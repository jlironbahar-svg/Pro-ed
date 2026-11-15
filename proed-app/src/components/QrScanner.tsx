import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ImageUp } from 'lucide-react';
import { Button } from '@proed/shared/ui';
import { useT } from '../lib/i18n';

/** Reads a QR code from the camera, with a photo picker as fallback. Calls onResult with the raw text. */
export function QrScanner({ onResult, accept }: { onResult: (text: string) => void; accept: (text: string) => boolean }) {
  const { t } = useT();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const decode = (source: CanvasImageSource, w: number, h: number): string | null => {
    const c = canvas.current;
    if (!c || !w || !h) return null;
    const scale = Math.min(1, 900 / Math.max(w, h));
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
    return code?.data ?? null;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const v = video.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (done.current) return;
          const text = decode(v, v.videoWidth, v.videoHeight);
          if (text && accept(text)) {
            done.current = true;
            onResult(text);
            return;
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError(t('login.qrCameraError'));
      }
    })();
    return () => {
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const bitmap = await createImageBitmap(f);
      const text = decode(bitmap, bitmap.width, bitmap.height);
      if (text && accept(text)) {
        done.current = true;
        onResult(text);
      } else setError(t('login.qrNotFound'));
    } catch {
      setError(t('login.qrNotFound'));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-black">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80" />
      </div>
      <canvas ref={canvas} className="hidden" />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button variant="secondary" icon={<ImageUp size={16} />} onClick={() => file.current?.click()}>
        {t('login.qrPhoto')}
      </Button>
    </div>
  );
}
