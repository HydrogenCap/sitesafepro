import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSync } from '@/offline/SyncContext';
import { enqueue } from '@/offline/queue';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';

export default function PhotoCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { triggerSync } = useSync();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch {
      toast({ title: 'Camera unavailable', description: 'Check browser permissions.', variant: 'destructive' });
    }
  }, [toast]);

  const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    // M4: Try 0.85 quality first; if too large, reduce quality progressively
    let quality = 0.85;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    while (dataUrl.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.3) {
      quality -= 0.15;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length * 0.75 > MAX_PHOTO_BYTES) {
      toast({ title: 'Photo too large', description: 'Could not compress below 2 MB. Try moving closer or reducing resolution.', variant: 'destructive' });
    }

    setCaptured(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream, toast]);

  const retake = useCallback(() => {
    setCaptured(null);
    startCamera();
  }, [startCamera]);

  const saveOffline = useCallback(async () => {
    if (!captured || !user || !membership) return;
    setSaving(true);

    try {
      const res = await fetch(captured);
      const ab = await res.arrayBuffer();

      await enqueue({
        type: 'evidence_photo',
        orgId: membership.orgId,
        payload: {
          evidence_id: uuid(),
          type: 'photo',
          caption,
          metadata_json: { mime_type: 'image/jpeg' },
        },
        blob: {
          data: ab,
          mimeType: 'image/jpeg',
          fileName: `capture-${Date.now()}.jpg`,
        },
        userId: user.id,
        capturedOffline: !navigator.onLine,
      });

      toast({ title: 'Photo saved offline', description: 'Will sync when connected.' });
      if (navigator.onLine) triggerSync();
      navigate('/site-mode');
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [captured, caption, user, membership, navigate, triggerSync, toast]);

  useEffect(() => {
    startCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between p-4 text-white">
        <button onClick={() => navigate(-1)} className="text-sm font-medium opacity-80">← Cancel</button>
        <h1 className="font-bold">Capture Photo</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 relative">
        {!captured ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <button
              onClick={takePhoto}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center"
            >
              <Camera className="h-8 w-8 text-black" />
            </button>
          </>
        ) : (
          <img src={captured} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      {captured && (
        <div className="bg-background p-4 space-y-3">
          <Input placeholder="Add a caption (optional)…" value={caption} onChange={e => setCaption(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={retake}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Retake
            </Button>
            <Button className="flex-1" onClick={saveOffline} disabled={saving}>
              <Check className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save Offline'}
            </Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
