import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveSeries {
  id: number;
  name: string;
}

export function useActiveSeries() {
  const [activeSeries, setActiveSeries] = useState<ActiveSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActive = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("series")
        .select("id, name")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;
      if (error) {
        setActiveSeries(null);
        setLoading(false);
        return;
      }

      setActiveSeries((data?.[0] as any) ?? null);
      setLoading(false);
    };

    fetchActive();

    const channel = supabase
      .channel("active-series-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "series" }, fetchActive)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { activeSeries, loading };
}
