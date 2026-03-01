import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { enqueue } from '@/offline/queue';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { useSync } from '@/offline/SyncContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';

export default function ActionCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { triggerSync } = useSync();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !membership || !title.trim()) return;
    setSaving(true);
    try {
      await enqueue({
        type: 'action_item',
        orgId: membership.orgId,
        payload: {
          entry: {
            id: uuid(),
            title,
            description,
            priority,
            raised_at: new Date().toISOString(),
            raised_by: user.id,
          },
        },
        userId: user.id,
      });
      toast({ title: 'Action saved offline' });
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
        <CheckSquare className="h-5 w-5 text-green-600" />
        <h1 className="font-bold flex-1">Add Action</h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Input placeholder="Action title" value={title} onChange={e => setTitle(e.target.value)} />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Description…" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
        <Button className="w-full" onClick={save} disabled={saving || !title.trim()}>
          <Check className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving…' : 'Save Offline'}
        </Button>
      </div>
    </div>
  );
}
