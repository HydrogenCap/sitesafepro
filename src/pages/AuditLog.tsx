import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Filter } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  UPDATE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DELETE: "bg-destructive/10 text-destructive",
};

export default function AuditLog() {
  const { membership } = useOrg();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", membership?.orgId, entityFilter],
    queryFn: async () => {
      if (!membership?.orgId) return [];
      let query = supabase
        .from("audit_events")
        .select("*")
        .eq("organisation_id", membership.orgId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (entityFilter && entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.orgId,
  });

  const filteredEvents = search
    ? events.filter(
        (e) =>
          e.action?.toLowerCase().includes(search.toLowerCase()) ||
          e.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
          e.entity_id?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  const entityTypes = [...new Set(events.map((e) => e.entity_type))].sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-muted-foreground text-sm">
              Immutable record of all security-relevant changes
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, entities..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="hidden md:table-cell">Entity ID</TableHead>
                    <TableHead className="hidden lg:table-cell">Actor</TableHead>
                    <TableHead className="hidden xl:table-cell">Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Loading audit events...
                      </TableCell>
                    </TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No audit events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.created_at), "dd MMM yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={ACTION_COLORS[event.action] ?? ""}
                          >
                            {event.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{event.entity_type}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {event.entity_id ? `${event.entity_id.slice(0, 8)}…` : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                          {event.actor_id ? `${event.actor_id.slice(0, 8)}…` : "system"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                          {event.metadata && Object.keys(event.metadata as object).length > 0
                            ? JSON.stringify(event.metadata).slice(0, 80)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
