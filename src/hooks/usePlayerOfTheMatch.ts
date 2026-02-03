import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface POTMAward {
  match_id: number;
  player_id: number;
  player_name: string;
  player_photo_url: string | null;
  match_date: string;
  opponent_name: string | null;
  result: string | null;
}

export interface POTMLeader {
  player_id: number;
  player_name: string;
  player_photo_url: string | null;
  player_role: string;
  award_count: number;
}

export function usePlayerOfTheMatch() {
  return useQuery({
    queryKey: ["player-of-the-match-hall-of-fame"],
    queryFn: async () => {
      // Fetch all matches with POTM awards
      const { data: matches, error } = await supabase
        .from("matches")
        .select("id, match_date, opponent_name, result, player_of_the_match_id")
        .not("player_of_the_match_id", "is", null)
        .order("match_date", { ascending: false });

      if (error) throw error;

      const playerIds = [...new Set((matches ?? []).map((m) => m.player_of_the_match_id).filter(Boolean) as number[])];

      if (playerIds.length === 0) {
        return { awards: [], leaders: [] };
      }

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, name, photo_url, role")
        .in("id", playerIds);

      if (playersError) throw playersError;

      const playersMap = new Map((players ?? []).map((p) => [p.id, p]));

      // Build awards list
      const awards: POTMAward[] = (matches ?? []).map((m) => {
        const p = playersMap.get(m.player_of_the_match_id!);
        return {
          match_id: m.id,
          player_id: m.player_of_the_match_id!,
          player_name: p?.name ?? "Unknown",
          player_photo_url: p?.photo_url ?? null,
          match_date: m.match_date,
          opponent_name: m.opponent_name,
          result: m.result,
        };
      });

      // Count awards per player
      const countMap = new Map<number, number>();
      for (const a of awards) {
        countMap.set(a.player_id, (countMap.get(a.player_id) ?? 0) + 1);
      }

      const leaders: POTMLeader[] = [...countMap.entries()]
        .map(([player_id, award_count]) => {
          const p = playersMap.get(player_id);
          return {
            player_id,
            player_name: p?.name ?? "Unknown",
            player_photo_url: p?.photo_url ?? null,
            player_role: p?.role ?? "",
            award_count,
          };
        })
        .sort((a, b) => b.award_count - a.award_count);

      return { awards, leaders };
    },
  });
}
