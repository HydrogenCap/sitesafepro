import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ExternalLink, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const SEVERITY_OPTIONS = [
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'minor_injury', label: 'Minor Injury' },
  { value: 'major_injury', label: 'Major Injury' },
  { value: 'dangerous_occurrence', label: 'Dangerous Occurrence' },
  { value: 'fatality', label: 'Fatality' },
] as const;

export default function IncidentCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    project_id: '',
    severity: 'near_miss',
    title: '',
    description: '',
    location: '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: member } = await supabase
        .from('organisation_members')
        .select('organisation_id')
        .eq('profile_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (!member) return;
      setOrganisationId(member.organisation_id);

      const { data: proj } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organisation_id', member.organisation_id)
        .eq('status', 'active');
      if (proj) setProjects(proj);
    })();
  }, [user]);

  const isRiddor = form.severity === 'major_injury' || form.severity === 'dangerous_occurrence' || form.severity === 'fatality';

  const useGps = () => {
    if (!navigator.geolocation) {
      toast({ title: 'GPS unavailable', description: 'Geolocation is not supported on this device', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, location: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` }));
        setLocating(false);
      },
      () => {
        toast({ title: 'GPS error', description: 'Could not get location', variant: 'destructive' });
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!user || !organisationId) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: 'Missing fields', description: 'Title and description are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const incidentNumber = `INC-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('incidents').insert({
        organisation_id: organisationId,
        project_id: form.project_id || null,
        incident_number: incidentNumber,
        severity: form.severity as any,
        status: isRiddor ? 'riddor_reportable' : 'reported',
        title: form.title,
        description: form.description,
        location: form.location || null,
        incident_date: format(new Date(), 'yyyy-MM-dd'),
        incident_time: format(new Date(), 'HH:mm'),
        is_riddor_reportable: isRiddor,
        reported_by: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Incident reported',
        description: isRiddor
          ? 'RIDDOR reportable — report to HSE immediately'
          : 'Incident recorded. Add more details from the Incidents page.',
        variant: isRiddor ? 'destructive' : 'default',
      });
      navigate('/site-mode');
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save incident', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/site-mode')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Incident
          </h1>
          <p className="text-xs text-muted-foreground">Fast entry — add details later</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Project */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Project</Label>
          <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Severity *</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* RIDDOR Warning */}
        {isRiddor && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>RIDDOR Reportable</AlertTitle>
            <AlertDescription>
              This incident must be reported to the HSE immediately.
              <a
                href="https://www.hse.gov.uk/riddor/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1 underline font-medium"
              >
                Report to HSE now <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">What happened? *</Label>
          <Input
            className="h-12 text-base"
            placeholder="Brief description"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Details *</Label>
          <Textarea
            className="text-base min-h-[100px]"
            placeholder="Describe what happened, who was involved, and any immediate actions taken"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Location on site</Label>
          <div className="flex gap-2">
            <Input
              className="h-12 text-base flex-1"
              placeholder="e.g. Ground floor, stairwell B"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Button type="button" size="icon" variant="outline" onClick={useGps} disabled={locating} className="h-12 w-12 shrink-0">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full h-14 text-lg font-semibold mt-4"
          onClick={handleSave}
          disabled={saving || !form.title.trim() || !form.description.trim()}
        >
          {saving ? 'Saving…' : 'Report Incident'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You can add injured person details, photos, and investigation notes from the full Incidents page.
        </p>
      </div>
    </div>
  );
}
