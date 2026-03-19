import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, FileText, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteDiaryEntry } from "@/types/siteDiary";

export default function SiteDiary() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['site-diary-entries', projectId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('site_diary_entries')
        .select('*')
        .eq('project_id', projectId)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(entry => ({
        ...entry,
        workforce_entries: entry.workforce_entries as unknown as SiteDiaryEntry['workforce_entries'],
        work_completed: entry.work_completed as unknown as SiteDiaryEntry['work_completed'],
        work_planned_tomorrow: entry.work_planned_tomorrow as unknown as SiteDiaryEntry['work_planned_tomorrow'],
        deliveries: entry.deliveries as unknown as SiteDiaryEntry['deliveries'],
        visitors: entry.visitors as unknown as SiteDiaryEntry['visitors'],
        plant_equipment: entry.plant_equipment as unknown as SiteDiaryEntry['plant_equipment'],
        safety_incidents: entry.safety_incidents as unknown as SiteDiaryEntry['safety_incidents'],
        instructions: entry.instructions as unknown as SiteDiaryEntry['instructions'],
        delays: entry.delays as unknown as SiteDiaryEntry['delays'],
        photos: entry.photos as unknown as SiteDiaryEntry['photos'],
      })) as SiteDiaryEntry[];
    },
  });

  const entriesByDate = useMemo(() => {
    const map = new Map<string, SiteDiaryEntry>();
    entries.forEach(entry => {
      map.set(entry.entry_date, entry);
    });
    return map;
  }, [entries]);

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    navigate(`/projects/${projectId}/diary/${dateStr}`);
  };

  const stats = useMemo(() => {
    const complete = entries.filter(e => e.status === 'complete').length;
    const draft = entries.filter(e => e.status === 'draft').length;
    return { complete, draft, total: entries.length };
  }, [entries]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Site Diary</h1>
              <p className="text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <Button onClick={() => handleDayClick(new Date())}>
            <Plus className="h-4 w-4 mr-2" />
            Today's Entry
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.complete}</div>
              <p className="text-sm text-muted-foreground">Completed Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-sm text-muted-foreground">Draft Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total This Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the month starts */}
              {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = entriesByDate.get(dateStr);
                const isFuture = day > new Date();
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && handleDayClick(day)}
                    disabled={isFuture}
                    className={cn(
                      "aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-center gap-1",
                      isToday(day) && "border-primary bg-primary/5",
                      !isToday(day) && "border-transparent hover:border-border hover:bg-muted/50",
                      isFuture && "opacity-50 cursor-not-allowed",
                      entry?.status === 'complete' && "bg-primary/10",
                      entry?.status === 'draft' && "bg-secondary"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isToday(day) && "text-primary",
                      !isSameMonth(day, currentMonth) && "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {entry && (
                      <Badge 
                        variant={entry.status === 'complete' ? 'default' : 'secondary'} 
                        className="text-[10px] px-1 py-0"
                      >
                        {entry.status === 'complete' ? '✓' : '○'}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No entries for this month yet</p>
            ) : (
              <div className="space-y-2">
                {entries.slice(0, 10).map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => navigate(`/projects/${projectId}/diary/${entry.entry_date}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-medium">
                          {format(parseISO(entry.entry_date), 'EEEE, d MMMM yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.workforce_total} workers • {entry.work_completed?.length || 0} activities
                        </div>
                      </div>
                    </div>
                    <Badge variant={entry.status === 'complete' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
