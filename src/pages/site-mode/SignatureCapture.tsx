import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenLine, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enqueue } from '@/offline/queue';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { useSync } from '@/offline/SyncContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';
import ReactSignatureCanvas from 'react-signature-canvas';

export default function SignatureCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { triggerSync } = useSync();
  const { toast } = useToast();
  const sigRef = useRef<ReactSignatureCanvas>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const clear = useCallback(() => {
    sigRef.current?.clear();
  }, []);

  const save = useCallback(async () => {
    if (!user || !membership || sigRef.current?.isEmpty()) return;
    setSaving(true);
    try {
      const dataUrl = sigRef.current!.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const ab = await res.arrayBuffer();

      await enqueue({
        type: 'evidence_signature',
        orgId: membership.orgId,
        payload: {
          evidence_id: uuid(),
          type: 'signature',
          caption: name || 'Signature',
          metadata_json: { signer_name: name },
        },
        blob: {
          data: ab,
          mimeType: 'image/png',
          fileName: `signature-${Date.now()}.png`,
        },
        userId: user.id,
      });
      toast({ title: 'Signature saved offline' });
      if (navigator.onLine) triggerSync();
      navigate('/site-mode');
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, membership, name, navigate, triggerSync, toast]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-muted-foreground" /></button>
        <PenLine className="h-5 w-5 text-purple-600" />
        <h1 className="font-bold flex-1">Capture Signature</h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Input placeholder="Signer name" value={name} onChange={e => setName(e.target.value)} />
        <div className="border rounded-lg bg-white overflow-hidden">
          <ReactSignatureCanvas
            ref={sigRef}
            canvasProps={{ className: 'w-full h-48' }}
            penColor="#1a1a1a"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={clear}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Clear
          </Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            <Check className="h-4 w-4 mr-1.5" />
            {saving ? 'Saving…' : 'Save Offline'}
          </Button>
        </div>
      </div>
    </div>
  );
}
