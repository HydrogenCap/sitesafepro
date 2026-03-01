import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';

export default function HazardCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { membership } = useOrg();
  const { toast } = useToast();
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('high');
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const save = async () => {
    if (!user || !membership || !description.trim()) return;
    setSaving(true);
    try {
      let photoStoragePath: string | null = null;
      let photoMimeType: string | null = null;

      // Upload photo if present
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `org/${membership.orgId}/hazards/${uuid()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(path, photoFile, { contentType: photoFile.type });
        if (uploadError) throw uploadError;
        photoStoragePath = path;
        photoMimeType = photoFile.type;
      }

      // Insert into site_hazards relational table
      const { error } = await supabase.from('site_hazards').insert({
        id: uuid(),
        organisation_id: membership.orgId,
        project_id: null,
        reported_by: user.id,
        severity,
        description,
        location: location || null,
        photo_storage_path: photoStoragePath,
        photo_mime_type: photoMimeType,
        reported_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Hazard reported successfully' });
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
        <AlertTriangle className="h-5 w-5 text-destructive" />
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

        {/* Photo capture */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Hazard photo" className="w-full rounded-lg max-h-48 object-cover" />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={removePhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Attach Photo
            </Button>
          )}
        </div>

        <Button className="w-full" onClick={save} disabled={saving || !description.trim()}>
          <Check className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving…' : 'Report Hazard'}
        </Button>
      </div>
    </div>
  );
}
