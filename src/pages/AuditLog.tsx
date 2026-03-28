import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Search, Filter, Download, Shield, Clock, User, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  order_placed: "bg-green-500/15 text-green-700 dark:text-green-400",
  order_billed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  order_voided: "bg-red-500/15 text-red-700 dark:text-red-400",
  item_voided: "bg-red-500/15 text-red-700 dark:text-red-400",
  discount_applied: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  table_merged: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  table_unmerged: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  menu_updated: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  staff_added: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  pin_changed: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  settings_changed: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "All Time", value: "all" },
];

const AuditLog = () => {
  const { hotelId } = useAuth();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("7days");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(0);

  const dateFilter = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") return startOfDay(now).toISOString();
    if (dateRange === "7days") return subDays(now, 7).toISOString();
    if (dateRange === "30days") return subDays(now, 30).toISOString();
    return null;
  }, [dateRange]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["audit-logs", hotelId, dateRange, actionFilter, page],
    queryFn: async () => {
      if (!hotelId) return { logs: [], count: 0 };

      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data: logs, error, count } = await query;
      if (error) throw error;
      return { logs: logs ?? [], count: count ?? 0 };
    },
    enabled: !!hotelId,
  });

  const logs = data?.logs ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action?.toLowerCase().includes(s) ||
        l.performer_name?.toLowerCase().includes(s) ||
        l.details?.toLowerCase().includes(s)
    );
  }, [logs, search]);

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const handleExport = () => {
    if (!filteredLogs.length) {
      toast.error("No logs to export");
      return;
    }
    const header = "Date,Time,Action,Performed By,Table,Order ID,Details";
    const rows = filteredLogs.map((l) => {
      const d = new Date(l.created_at);
      return [
        format(d, "yyyy-MM-dd"),
        format(d, "HH:mm:ss"),
        l.action,
        l.performer_name || "-",
        l.table_number ?? "-",
        l.order_id ? l.order_id.slice(0, 8) : "-",
        `"${(l.details || "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Track every action across your restaurant
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 w-fit">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: totalCount, icon: FileText },
          { label: "Period", value: DATE_RANGES.find((d) => d.value === dateRange)?.label ?? "", icon: Clock },
          { label: "Unique Actions", value: uniqueActions.length, icon: Filter },
          { label: "Staff Involved", value: new Set(logs.map((l) => l.performed_by)).size, icon: User },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions, staff, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{formatAction(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="text-center">Table</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="min-w-[200px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No audit events found</p>
                    <p className="text-xs mt-1">Actions like orders, voids, and settings changes will appear here</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div>{format(new Date(log.created_at), "dd MMM yyyy")}</div>
                      <div className="text-[11px]">{format(new Date(log.created_at), "hh:mm:ss a")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium ${ACTION_COLORS[log.action] || "bg-muted text-foreground"}`}
                      >
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.performer_name || "System"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {log.table_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.order_id ? log.order_id.slice(0, 8) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {log.details || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLog;
