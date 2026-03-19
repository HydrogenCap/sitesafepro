import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RamsFormData, ActivityLibraryItem, parseJsonArray } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, X, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step2Props {
  formData: RamsFormData;
  updateFormData: (updates: Partial<RamsFormData>) => void;
}

const CATEGORIES = [
  "General Site",
  "Groundworks",
  "Structural",
  "Working at Height",
  "Services & Finishes",
  "Specialist",
];

export function Step2ActivitySelector({ formData, updateFormData }: Step2Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES);

  // Fetch activity library
  const { data: activities, isLoading } = useQuery({
    queryKey: ["rams-activity-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rams_activity_library")
        .select("id, name, category, description, default_hazards, default_method_steps, default_ppe, legislation_refs")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Filter activities by search
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Group by category
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityLibraryItem[]> = {};
    CATEGORIES.forEach((cat) => (groups[cat] = []));
    filteredActivities.forEach((activity) => {
      if (groups[activity.category]) {
        groups[activity.category].push(activity);
      }
    });
    return groups;
  }, [filteredActivities]);

  // Toggle activity selection
  const toggleActivity = (activityId: string) => {
    const current = formData.selectedActivityIds;
    const updated = current.includes(activityId)
      ? current.filter((id) => id !== activityId)
      : [...current, activityId];
    updateFormData({ selectedActivityIds: updated });
  };

  // Remove activity from selection
  const removeActivity = (activityId: string) => {
    updateFormData({
      selectedActivityIds: formData.selectedActivityIds.filter((id) => id !== activityId),
    });
  };

  // Calculate totals
  const selectedActivities = activities?.filter((a) =>
    formData.selectedActivityIds.includes(a.id)
  ) || [];
  
  const totalHazards = selectedActivities.reduce(
    (sum, a) => sum + parseJsonArray(a.default_hazards).length,
    0
  );
  
  const totalSteps = selectedActivities.reduce(
    (sum, a) => sum + parseJsonArray(a.default_method_steps).length,
    0
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Select Work Activities</CardTitle>
          <CardDescription>
            Choose the activities relevant to this RAMS. Hazards and method steps will be pre-populated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Activity Categories */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <Accordion
                type="multiple"
                value={expandedCategories}
                onValueChange={setExpandedCategories}
              >
                {CATEGORIES.map((category) => {
                  const categoryActivities = groupedActivities[category] || [];
                  if (categoryActivities.length === 0) return null;

                  const selectedCount = categoryActivities.filter((a) =>
                    formData.selectedActivityIds.includes(a.id)
                  ).length;

                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>{category}</span>
                          <Badge variant="secondary" className="ml-2">
                            {categoryActivities.length}
                          </Badge>
                          {selectedCount > 0 && (
                            <Badge variant="default" className="ml-1">
                              {selectedCount} selected
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {categoryActivities.map((activity) => {
                            const isSelected = formData.selectedActivityIds.includes(activity.id);
                            const hazardCount = parseJsonArray(activity.default_hazards).length;

                            return (
                              <div
                                key={activity.id}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted/50"
                                )}
                                onClick={() => toggleActivity(activity.id)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleActivity(activity.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{activity.name}</span>
                                    {isSelected && (
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  {activity.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {activity.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {hazardCount} hazards
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Selected Activities Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activities selected yet. Choose from the list.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {selectedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
                    >
                      <span className="text-sm font-medium truncate">
                        {activity.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeActivity(activity.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Activities:</span>
                    <span className="font-medium">{selectedActivities.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pre-loaded hazards:</span>
                    <span className="font-medium">{totalHazards}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method steps:</span>
                    <span className="font-medium">{totalSteps}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Assist (placeholder for future) */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">AI Activity Suggestions</p>
              <p className="text-xs text-muted-foreground">
                Coming soon — AI will suggest relevant activities based on your work description.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
