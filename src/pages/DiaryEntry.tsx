import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, Save, CheckCircle, Cloud, Sun, Users, Hammer, 
  Truck, UserCheck, Wrench, Shield, FileText, AlertTriangle, 
  Camera, StickyNote, ChevronDown, Plus, Trash2, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  SiteDiaryEntry, WorkforceEntry, WorkItem, DeliveryEntry, 
  VisitorEntry, PlantEquipmentEntry, SafetyIncident, 
  InstructionEntry, DelayEntry, WEATHER_CONDITIONS 
} from "@/types/siteDiary";

const WEATHER_OPTIONS = [
  'Clear', 'Sunny', 'Partly Cloudy', 'Cloudy', 'Overcast',
  'Light Rain', 'Heavy Rain', 'Showers', 'Thunderstorms',
  'Snow', 'Sleet', 'Fog', 'Frost', 'Windy', 'Hot', 'Cold'
] as const;

const generateId = () => crypto.randomUUID();

const defaultEntry: Partial<SiteDiaryEntry> = {
  status: 'draft',
  weather_conditions: [],
  workforce_entries: [],
  workforce_total: 0,
  work_completed: [],
  work_planned_tomorrow: [],
  deliveries: [],
  visitors: [],
  plant_equipment: [],
  safety_incidents: [],
  toolbox_talk_delivered: false,
  instructions: [],
  delays: [],
  photos: [],
};

export default function DiaryEntry() {
  const { id: projectId, date } = useParams<{ id: string; date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [entry, setEntry] = useState<Partial<SiteDiaryEntry>>(defaultEntry);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    weather: true,
    workforce: false,
    work: false,
    deliveries: false,
    visitors: false,
    plant: false,
    safety: false,
    instructions: false,
    delays: false,
    photos: false,
    notes: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingEntry, isLoading } = useQuery({
    queryKey: ['diary-entry', projectId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_diary_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('entry_date', date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        workforce_entries: data.workforce_entries as unknown as SiteDiaryEntry['workforce_entries'],
        work_completed: data.work_completed as unknown as SiteDiaryEntry['work_completed'],
        work_planned_tomorrow: data.work_planned_tomorrow as unknown as SiteDiaryEntry['work_planned_tomorrow'],
        deliveries: data.deliveries as unknown as SiteDiaryEntry['deliveries'],
        visitors: data.visitors as unknown as SiteDiaryEntry['visitors'],
        plant_equipment: data.plant_equipment as unknown as SiteDiaryEntry['plant_equipment'],
        safety_incidents: data.safety_incidents as unknown as SiteDiaryEntry['safety_incidents'],
        instructions: data.instructions as unknown as SiteDiaryEntry['instructions'],
        delays: data.delays as unknown as SiteDiaryEntry['delays'],
        photos: data.photos as unknown as SiteDiaryEntry['photos'],
      } as SiteDiaryEntry;
    },
  });

  const { data: memberData } = useQuery({
    queryKey: ['user-organisation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('organisation_id')
        .eq('profile_id', user?.id)
        .eq('status', 'active')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (existingEntry) {
      setEntry({
        ...defaultEntry,
        ...existingEntry,
        workforce_entries: existingEntry.workforce_entries || [],
        work_completed: existingEntry.work_completed || [],
        work_planned_tomorrow: existingEntry.work_planned_tomorrow || [],
        deliveries: existingEntry.deliveries || [],
        visitors: existingEntry.visitors || [],
        plant_equipment: existingEntry.plant_equipment || [],
        safety_incidents: existingEntry.safety_incidents || [],
        instructions: existingEntry.instructions || [],
        delays: existingEntry.delays || [],
        photos: existingEntry.photos || [],
        weather_conditions: existingEntry.weather_conditions || [],
      });
    }
  }, [existingEntry]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SiteDiaryEntry>) => {
      const workforceTotal = (data.workforce_entries || [])
        .reduce((sum, w) => sum + (w.count || 0), 0);
      
      const payload = {
        project_id: projectId,
        organisation_id: memberData?.organisation_id,
        entry_date: date,
        status: data.status || 'draft',
        weather_morning: data.weather_morning,
        weather_afternoon: data.weather_afternoon,
        temperature_high: data.temperature_high,
        temperature_low: data.temperature_low,
        weather_conditions: data.weather_conditions,
        weather_impact: data.weather_impact,
        workforce_entries: JSON.parse(JSON.stringify(data.workforce_entries || [])),
        workforce_total: workforceTotal,
        work_completed: JSON.parse(JSON.stringify(data.work_completed || [])),
        work_planned_tomorrow: JSON.parse(JSON.stringify(data.work_planned_tomorrow || [])),
        deliveries: JSON.parse(JSON.stringify(data.deliveries || [])),
        visitors: JSON.parse(JSON.stringify(data.visitors || [])),
        plant_equipment: JSON.parse(JSON.stringify(data.plant_equipment || [])),
        safety_incidents: JSON.parse(JSON.stringify(data.safety_incidents || [])),
        safety_observations: data.safety_observations,
        toolbox_talk_delivered: data.toolbox_talk_delivered,
        toolbox_talk_topic: data.toolbox_talk_topic,
        instructions: JSON.parse(JSON.stringify(data.instructions || [])),
        delays: JSON.parse(JSON.stringify(data.delays || [])),
        photos: JSON.parse(JSON.stringify(data.photos || [])),
        notes: data.notes,
        completed_at: data.completed_at,
        completed_by: data.completed_by,
        created_by: existingEntry ? existingEntry.created_by : user?.id,
      };

      if (existingEntry?.id) {
        const { data: result, error } = await supabase
          .from('site_diary_entries')
          .update(payload)
          .eq('id', existingEntry.id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('site_diary_entries')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['diary-entry', projectId, date] });
      queryClient.invalidateQueries({ queryKey: ['site-diary-entries', projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error saving entry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = useCallback(async (showToast = true) => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(entry);
      if (showToast) {
        toast({ title: "Entry saved" });
      }
    } finally {
      setIsSaving(false);
    }
  }, [entry, saveMutation, toast]);

  const handleComplete = async () => {
    const completedEntry = {
      ...entry,
      status: 'complete' as const,
      completed_at: new Date().toISOString(),
      completed_by: user?.id,
    };
    setEntry(completedEntry);
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(completedEntry);
      toast({ title: "Entry marked as complete" });
      navigate(`/projects/${projectId}/diary`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (entry && memberData?.organisation_id && !isSaving) {
        handleSave(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [entry, memberData, isSaving, handleSave]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateEntry = <K extends keyof SiteDiaryEntry>(key: K, value: SiteDiaryEntry[K]) => {
    setEntry(prev => ({ ...prev, [key]: value }));
  };

  const addWorkforceEntry = () => {
    const newEntry: WorkforceEntry = { id: generateId(), trade: '', company: '', count: 0, hours: 8 };
    updateEntry('workforce_entries', [...(entry.workforce_entries || []), newEntry]);
  };

  const updateWorkforceEntry = (id: string, field: keyof WorkforceEntry, value: string | number) => {
    const updated = (entry.workforce_entries || []).map(w => 
      w.id === id ? { ...w, [field]: value } : w
    );
    updateEntry('workforce_entries', updated);
  };

  const removeWorkforceEntry = (id: string) => {
    updateEntry('workforce_entries', (entry.workforce_entries || []).filter(w => w.id !== id));
  };

  const addWorkItem = (field: 'work_completed' | 'work_planned_tomorrow') => {
    const newItem: WorkItem = { id: generateId(), location: '', description: '' };
    updateEntry(field, [...(entry[field] || []), newItem]);
  };

  const updateWorkItem = (field: 'work_completed' | 'work_planned_tomorrow', id: string, key: keyof WorkItem, value: string) => {
    const updated = (entry[field] || []).map(w => 
      w.id === id ? { ...w, [key]: value } : w
    );
    updateEntry(field, updated);
  };

  const removeWorkItem = (field: 'work_completed' | 'work_planned_tomorrow', id: string) => {
    updateEntry(field, (entry[field] || []).filter(w => w.id !== id));
  };

  const toggleWeatherCondition = (condition: string) => {
    const current = entry.weather_conditions || [];
    const updated = current.includes(condition)
      ? current.filter(c => c !== condition)
      : [...current, condition];
    updateEntry('weather_conditions', updated);
  };

  const fetchWeatherWithAI = async () => {
    const location = project?.address || project?.name;
    if (!location) {
      toast({
        title: "Location required",
        description: "Please add a project address to fetch weather data.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { location, date }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Update entry with fetched weather data
      setEntry(prev => ({
        ...prev,
        weather_morning: data.weather_morning || prev.weather_morning,
        weather_afternoon: data.weather_afternoon || prev.weather_afternoon,
        temperature_high: data.temperature_high ?? prev.temperature_high,
        temperature_low: data.temperature_low ?? prev.temperature_low,
        weather_conditions: data.conditions || prev.weather_conditions,
        weather_impact: data.weather_impact || prev.weather_impact,
      }));

      toast({
        title: "Weather populated",
        description: "AI has filled in the weather information based on your location.",
      });
    } catch (error: any) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Failed to fetch weather",
        description: error.message || "Please try again or enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingWeather(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const formattedDate = date ? format(parseISO(date), 'EEEE, d MMMM yyyy') : '';

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-4 -mx-4 px-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}/diary`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{formattedDate}</h1>
              <p className="text-sm text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {format(lastSaved, 'HH:mm')}
              </span>
            )}
            <Badge variant={entry.status === 'complete' ? 'default' : 'secondary'}>
              {entry.status}
            </Badge>
          </div>
        </div>

        {/* Weather Section */}
        <CollapsibleSection
          title="Weather"
          icon={<Sun className="h-4 w-4" />}
          isOpen={openSections.weather}
          onToggle={() => toggleSection('weather')}
        >
          <div className="space-y-4">
            {/* AI Weather Fetch Button */}
            <Button 
              variant="outline" 
              onClick={fetchWeatherWithAI} 
              disabled={isFetchingWeather}
              className="w-full"
            >
              {isFetchingWeather ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              {isFetchingWeather ? 'Fetching weather...' : 'Auto-fill with AI'}
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Morning</Label>
                <Input 
                  placeholder="e.g., Clear, 12°C"
                  value={entry.weather_morning || ''}
                  onChange={e => updateEntry('weather_morning', e.target.value)}
                />
              </div>
              <div>
                <Label>Afternoon</Label>
                <Input 
                  placeholder="e.g., Cloudy, 15°C"
                  value={entry.weather_afternoon || ''}
                  onChange={e => updateEntry('weather_afternoon', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>High Temp (°C)</Label>
                <Input 
                  type="number"
                  value={entry.temperature_high || ''}
                  onChange={e => updateEntry('temperature_high', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div>
                <Label>Low Temp (°C)</Label>
                <Input 
                  type="number"
                  value={entry.temperature_low || ''}
                  onChange={e => updateEntry('temperature_low', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
            <div>
              <Label>Conditions</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {WEATHER_OPTIONS.map(condition => (
                  <Badge
                    key={condition}
                    variant={(entry.weather_conditions || []).includes(condition) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleWeatherCondition(condition)}
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Weather Impact on Works</Label>
              <Textarea 
                placeholder="Any weather-related delays or impacts..."
                value={entry.weather_impact || ''}
                onChange={e => updateEntry('weather_impact', e.target.value)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Workforce Section */}
        <CollapsibleSection
          title="Workforce"
          icon={<Users className="h-4 w-4" />}
          isOpen={openSections.workforce}
          onToggle={() => toggleSection('workforce')}
          badge={`${(entry.workforce_entries || []).reduce((s, w) => s + (w.count || 0), 0)} workers`}
        >
          <div className="space-y-4">
            {(entry.workforce_entries || []).map((worker, index) => (
              <div key={worker.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <Input 
                    placeholder="Trade"
                    value={worker.trade}
                    onChange={e => updateWorkforceEntry(worker.id, 'trade', e.target.value)}
                  />
                  <Input 
                    placeholder="Company"
                    value={worker.company}
                    onChange={e => updateWorkforceEntry(worker.id, 'company', e.target.value)}
                  />
                  <Input 
                    type="number"
                    placeholder="Count"
                    value={worker.count || ''}
                    onChange={e => updateWorkforceEntry(worker.id, 'count', parseInt(e.target.value) || 0)}
                  />
                  <Input 
                    type="number"
                    placeholder="Hours"
                    value={worker.hours || ''}
                    onChange={e => updateWorkforceEntry(worker.id, 'hours', parseInt(e.target.value) || 0)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeWorkforceEntry(worker.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addWorkforceEntry} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Trade
            </Button>
          </div>
        </CollapsibleSection>

        {/* Work Summary Section */}
        <CollapsibleSection
          title="Work Summary"
          icon={<Hammer className="h-4 w-4" />}
          isOpen={openSections.work}
          onToggle={() => toggleSection('work')}
          badge={`${(entry.work_completed || []).length} activities`}
        >
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Work Completed Today</Label>
              <div className="space-y-2 mt-2">
                {(entry.work_completed || []).map(item => (
                  <div key={item.id} className="flex gap-2">
                    <Input 
                      placeholder="Location"
                      value={item.location}
                      onChange={e => updateWorkItem('work_completed', item.id, 'location', e.target.value)}
                      className="w-1/3"
                    />
                    <Input 
                      placeholder="Description of work"
                      value={item.description}
                      onChange={e => updateWorkItem('work_completed', item.id, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeWorkItem('work_completed', item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addWorkItem('work_completed')} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Work Item
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-base font-medium">Work Planned for Tomorrow</Label>
              <div className="space-y-2 mt-2">
                {(entry.work_planned_tomorrow || []).map(item => (
                  <div key={item.id} className="flex gap-2">
                    <Input 
                      placeholder="Location"
                      value={item.location}
                      onChange={e => updateWorkItem('work_planned_tomorrow', item.id, 'location', e.target.value)}
                      className="w-1/3"
                    />
                    <Input 
                      placeholder="Description of planned work"
                      value={item.description}
                      onChange={e => updateWorkItem('work_planned_tomorrow', item.id, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeWorkItem('work_planned_tomorrow', item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addWorkItem('work_planned_tomorrow')} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Planned Work
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Health & Safety Section */}
        <CollapsibleSection
          title="Health & Safety"
          icon={<Shield className="h-4 w-4" />}
          isOpen={openSections.safety}
          onToggle={() => toggleSection('safety')}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="toolbox-talk"
                checked={entry.toolbox_talk_delivered || false}
                onCheckedChange={checked => updateEntry('toolbox_talk_delivered', !!checked)}
              />
              <Label htmlFor="toolbox-talk">Toolbox Talk Delivered</Label>
            </div>
            {entry.toolbox_talk_delivered && (
              <div>
                <Label>Toolbox Talk Topic</Label>
                <Input 
                  placeholder="Topic covered..."
                  value={entry.toolbox_talk_topic || ''}
                  onChange={e => updateEntry('toolbox_talk_topic', e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Safety Observations</Label>
              <Textarea 
                placeholder="Any safety observations, near misses, or concerns..."
                value={entry.safety_observations || ''}
                onChange={e => updateEntry('safety_observations', e.target.value)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Delays Section */}
        <CollapsibleSection
          title="Delays & Issues"
          icon={<AlertTriangle className="h-4 w-4" />}
          isOpen={openSections.delays}
          onToggle={() => toggleSection('delays')}
        >
          <div className="space-y-4">
            {(entry.delays || []).map(delay => (
              <Card key={delay.id} className="p-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="Cause of delay"
                    value={delay.cause}
                    onChange={e => {
                      const updated = (entry.delays || []).map(d => 
                        d.id === delay.id ? { ...d, cause: e.target.value } : d
                      );
                      updateEntry('delays', updated);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      placeholder="Duration"
                      value={delay.duration}
                      onChange={e => {
                        const updated = (entry.delays || []).map(d => 
                          d.id === delay.id ? { ...d, duration: e.target.value } : d
                        );
                        updateEntry('delays', updated);
                      }}
                    />
                    <Input 
                      placeholder="Impact"
                      value={delay.impact}
                      onChange={e => {
                        const updated = (entry.delays || []).map(d => 
                          d.id === delay.id ? { ...d, impact: e.target.value } : d
                        );
                        updateEntry('delays', updated);
                      }}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => updateEntry('delays', (entry.delays || []).filter(d => d.id !== delay.id))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </Card>
            ))}
            <Button 
              variant="outline" 
              onClick={() => {
                const newDelay: DelayEntry = { id: generateId(), cause: '', duration: '', impact: '' };
                updateEntry('delays', [...(entry.delays || []), newDelay]);
              }} 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Delay
            </Button>
          </div>
        </CollapsibleSection>

        {/* Notes Section */}
        <CollapsibleSection
          title="General Notes"
          icon={<StickyNote className="h-4 w-4" />}
          isOpen={openSections.notes}
          onToggle={() => toggleSection('notes')}
        >
          <Textarea 
            placeholder="Any additional notes or observations..."
            className="min-h-[120px]"
            value={entry.notes || ''}
            onChange={e => updateEntry('notes', e.target.value)}
          />
        </CollapsibleSection>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleComplete} disabled={isSaving}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, isOpen, onToggle, badge, children }: CollapsibleSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
                {badge && <Badge variant="secondary" className="ml-2">{badge}</Badge>}
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
