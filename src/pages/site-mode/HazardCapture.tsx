import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
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

export default function HazardCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { triggerSync } = useSync();
  const { toast } = useToast();
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !membership || !description.trim()) return;
    setSaving(true);
    try {
      await enqueue({
        type: 'hazard_note',
        orgId: membership.orgId,
        payload: {
          entry: {
            id: uuid(),
            description,
            location,
            severity,
            reported_at: new Date().toISOString(),
            reported_by: user.id,
          },
        },
        userId: user.id,
      });
      toast({ title: 'Hazard saved offline' });
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
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h1 className="font-bold flex-1">Report Hazard</h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Input placeholder="Location on site" value={location} onChange={e => setLocation(e.target.value)} />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Describe the hazard…" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
        <Button className="w-full" onClick={save} disabled={saving || !description.trim()}>
          <Check className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving…' : 'Save Offline'}
        </Button>
      </div>
    </div>
  );
}
