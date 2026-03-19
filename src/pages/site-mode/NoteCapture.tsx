import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { enqueue } from '@/offline/queue';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { useSync } from '@/offline/SyncContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';

export default function NoteCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { triggerSync } = useSync();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !membership || !content.trim()) return;
    setSaving(true);
    try {
      await enqueue({
        type: 'evidence_note',
        orgId: membership.orgId,
        payload: {
          evidence_id: uuid(),
          type: 'note',
          caption: title || 'Note',
          metadata_json: { text: content },
        },
        userId: user.id,
      });
      toast({ title: 'Note saved offline' });
      if (navigator.onLine) triggerSync();
      navigate('/site-mode');
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-muted-foreground" /></button>
        <h1 className="font-bold flex-1">Add Note</h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea placeholder="Write your note…" rows={6} value={content} onChange={e => setContent(e.target.value)} />
        <Button className="w-full" onClick={save} disabled={saving || !content.trim()}>
          <Check className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving…' : 'Save Offline'}
        </Button>
      </div>
    </div>
  );
}
