import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { History, Search, Shield } from "lucide-react";
import type { AuditEvent, AdminLogEntry } from "@/types/admin";

interface AuditLogViewerProps {
  auditEvents: AuditEvent[];
  adminLog: AdminLogEntry[];
}

export function AuditLogViewer({ auditEvents, adminLog }: AuditLogViewerProps) {
  const [auditSearch, setAuditSearch] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");

  const filteredAuditEvents = auditEvents.filter((e) => {
    const qs = auditSearch.toLowerCase();
    const matchSearch = !qs || e.action.toLowerCase().includes(qs) || e.entity_type.toLowerCase().includes(qs) || (e.orgName ?? "").toLowerCase().includes(qs);
    const matchEntity = auditEntityFilter === "all" || e.entity_type === auditEntityFilter;
    return matchSearch && matchEntity;
  });
  const auditEntityTypes = [...new Set(auditEvents.map((e) => e.entity_type))].sort();

  return { filteredAuditEvents, auditEntityTypes, auditSearch, setAuditSearch, auditEntityFilter, setAuditEntityFilter };
}

// Renders the audit log tab content
export function AuditLogTab({ auditEvents }: { auditEvents: AuditEvent[] }) {
  const [auditSearch, setAuditSearch] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");

  const filteredAuditEvents = auditEvents.filter((e) => {
    const qs = auditSearch.toLowerCase();
    const matchSearch = !qs || e.action.toLowerCase().includes(qs) || e.entity_type.toLowerCase().includes(qs) || (e.orgName ?? "").toLowerCase().includes(qs);
    const matchEntity = auditEntityFilter === "all" || e.entity_type === auditEntityFilter;
    return matchSearch && matchEntity;
  });
  const auditEntityTypes = [...new Set(auditEvents.map((e) => e.entity_type))].sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Cross-Platform Audit Log</CardTitle>
        <CardDescription>Security events across all organisations — last 300 events.</CardDescription>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search actions, entity types, orgs…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="pl-9 h-8 text-xs" />
          </div>
          <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              {auditEntityTypes.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[480px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs pl-6">Action</TableHead>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">Organisation</TableHead>
                <TableHead className="text-xs">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuditEvents.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs">No events match filters.</TableCell></TableRow>
              ) : filteredAuditEvents.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/20">
                  <TableCell className="pl-6">
                    <Badge variant="secondary" className={`text-xs font-mono ${e.action.startsWith("INSERT") ? "bg-emerald-500/10 text-emerald-700" : e.action.startsWith("DELETE") ? "bg-destructive/10 text-destructive" : e.action.startsWith("ADMIN_") ? "bg-purple-500/10 text-purple-700" : "bg-amber-500/10 text-amber-700"}`}>
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{e.entity_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.orgName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), "dd MMM, HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function AdminActionsTab({ adminLog }: { adminLog: AdminLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" />Admin Action Log</CardTitle>
        <CardDescription>Immutable record of all actions taken from this admin panel. Written to audit_events and cannot be modified.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {adminLog.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">No admin actions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Actions taken from this panel appear here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs pl-6">Action</TableHead>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminLog.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/20">
                  <TableCell className="pl-6">
                    <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 font-mono">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
