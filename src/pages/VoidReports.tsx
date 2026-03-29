import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, AlertTriangle, CalendarDays, Clock, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";

interface VoidReport {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  reason: string;
  voided_by: string;
  voided_by_name?: string;
  order_id: string;
  created_at: string;
}

const VoidReports = () => {
  const { hotelId } = useAuth();
  const [voids, setVoids] = useState<VoidReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const getLocalDateRange = (date: string) => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  };

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      setLoading(true);
      const { startIso, endIso } = getLocalDateRange(selectedDate);

      const { data } = await supabase
        .from("void_reports")
        .select("*")
        .eq("hotel_id", hotelId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false });

      const reports = (data || []) as VoidReport[];

      // Fetch voider names
      const voiderIds = [...new Set(reports.map(v => v.voided_by))];
      let nameMap: Record<string, string> = {};
      if (voiderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", voiderIds);
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "Unknown"; });
      }

      setVoids(reports.map(v => ({ ...v, voided_by_name: nameMap[v.voided_by] || "Unknown" })));
      setLoading(false);
    })();
  }, [hotelId, selectedDate]);

  const totalLoss = useMemo(() => voids.reduce((sum, v) => sum + (v.item_price * v.quantity), 0), [voids]);
  const reasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    voids.forEach(v => { counts[v.reason] = (counts[v.reason] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [voids]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Void Reports
        </h1>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{voids.length}</p>
            <p className="text-xs text-muted-foreground">Total Voids</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-destructive">₹{totalLoss.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Loss</p>
          </CardContent>
        </Card>
        <Card className="glass-card col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{reasonCounts.length}</p>
            <p className="text-xs text-muted-foreground">Unique Reasons</p>
          </CardContent>
        </Card>
      </div>

      {/* Reason Breakdown */}
      {reasonCounts.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3">Reason Breakdown</h2>
            <div className="flex flex-wrap gap-2">
              {reasonCounts.map(([reason, count]) => (
                <Badge key={reason} variant="outline" className="text-xs">
                  {reason} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Void List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : voids.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No voids recorded for {format(new Date(selectedDate), "dd MMM yyyy")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {voids.map(v => (
            <Card key={v.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{v.item_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>Qty: {v.quantity}</span>
                      <span>₹{v.item_price} each</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(v.created_at), "hh:mm a")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">-₹{(v.item_price * v.quantity).toFixed(0)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <Badge variant="secondary">{v.reason}</Badge>
                  <span className="text-muted-foreground">by {v.voided_by_name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VoidReports;
