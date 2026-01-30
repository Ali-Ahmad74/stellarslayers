import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const int0 = z.number().int().min(0);

const rowSchema = z.object({
  player_id: z.number().int().positive(),
  batting: z
    .object({
      runs: int0,
      balls: int0,
      fours: int0,
      sixes: int0,
      out: z.boolean(),
    })
    .optional(),
  bowling: z
    .object({
      balls: int0,
      runs_conceded: int0,
      wickets: int0,
      maidens: int0,
      wides: int0,
      no_balls: int0,
      fours_conceded: int0,
      sixes_conceded: int0,
    })
    .optional(),
  fielding: z
    .object({
      catches: int0,
      runouts: int0,
      stumpings: int0,
      dropped_catches: int0,
    })
    .optional(),
});

const payloadSchema = z.object({
  match_id: z.number().int().positive(),
  rows: z.array(rowSchema).min(1).max(30),
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Not authenticated" }, { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server misconfigured" }, { status: 500 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify admin role explicitly
    const { data: roleData } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return jsonResponse({ error: "Admin role required" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const matchId = parsed.data.match_id;
    const playerIds = parsed.data.rows.map((r) => r.player_id);

    // Prefetch existing rows for this match to do update vs insert
    const [battingExisting, bowlingExisting, fieldingExisting] = await Promise.all([
      client.from("batting_inputs").select("id, player_id").eq("match_id", matchId).in("player_id", playerIds),
      client.from("bowling_inputs").select("id, player_id").eq("match_id", matchId).in("player_id", playerIds),
      client.from("fielding_inputs").select("id, player_id").eq("match_id", matchId).in("player_id", playerIds),
    ]);

    if (battingExisting.error) throw battingExisting.error;
    if (bowlingExisting.error) throw bowlingExisting.error;
    if (fieldingExisting.error) throw fieldingExisting.error;

    const battingByPlayer = new Map<number, number>();
    const bowlingByPlayer = new Map<number, number>();
    const fieldingByPlayer = new Map<number, number>();

    for (const r of battingExisting.data ?? []) battingByPlayer.set(r.player_id as number, r.id as number);
    for (const r of bowlingExisting.data ?? []) bowlingByPlayer.set(r.player_id as number, r.id as number);
    for (const r of fieldingExisting.data ?? []) fieldingByPlayer.set(r.player_id as number, r.id as number);

    const errors: string[] = [];

    for (const row of parsed.data.rows) {
      // Batting
      if (row.batting) {
        const existingId = battingByPlayer.get(row.player_id);
        if (existingId) {
          const res = await client
            .from("batting_inputs")
            .update({
              runs: row.batting.runs,
              balls: row.batting.balls,
              fours: row.batting.fours,
              sixes: row.batting.sixes,
              out: row.batting.out,
            })
            .eq("id", existingId);
          if (res.error) errors.push(`batting p${row.player_id}: ${res.error.message}`);
        } else {
          const res = await client.from("batting_inputs").insert({
            match_id: matchId,
            player_id: row.player_id,
            runs: row.batting.runs,
            balls: row.batting.balls,
            fours: row.batting.fours,
            sixes: row.batting.sixes,
            out: row.batting.out,
          });
          if (res.error) errors.push(`batting p${row.player_id}: ${res.error.message}`);
        }
      }

      // Bowling
      if (row.bowling) {
        const existingId = bowlingByPlayer.get(row.player_id);
        if (existingId) {
          const res = await client
            .from("bowling_inputs")
            .update({
              balls: row.bowling.balls,
              runs_conceded: row.bowling.runs_conceded,
              wickets: row.bowling.wickets,
              maidens: row.bowling.maidens,
              wides: row.bowling.wides,
              no_balls: row.bowling.no_balls,
              fours_conceded: row.bowling.fours_conceded,
              sixes_conceded: row.bowling.sixes_conceded,
            })
            .eq("id", existingId);
          if (res.error) errors.push(`bowling p${row.player_id}: ${res.error.message}`);
        } else {
          const res = await client.from("bowling_inputs").insert({
            match_id: matchId,
            player_id: row.player_id,
            balls: row.bowling.balls,
            runs_conceded: row.bowling.runs_conceded,
            wickets: row.bowling.wickets,
            maidens: row.bowling.maidens,
            wides: row.bowling.wides,
            no_balls: row.bowling.no_balls,
            fours_conceded: row.bowling.fours_conceded,
            sixes_conceded: row.bowling.sixes_conceded,
          });
          if (res.error) errors.push(`bowling p${row.player_id}: ${res.error.message}`);
        }
      }

      // Fielding
      if (row.fielding) {
        const existingId = fieldingByPlayer.get(row.player_id);
        if (existingId) {
          const res = await client
            .from("fielding_inputs")
            .update({
              catches: row.fielding.catches,
              runouts: row.fielding.runouts,
              stumpings: row.fielding.stumpings,
              dropped_catches: row.fielding.dropped_catches,
            })
            .eq("id", existingId);
          if (res.error) errors.push(`fielding p${row.player_id}: ${res.error.message}`);
        } else {
          const res = await client.from("fielding_inputs").insert({
            match_id: matchId,
            player_id: row.player_id,
            catches: row.fielding.catches,
            runouts: row.fielding.runouts,
            stumpings: row.fielding.stumpings,
            dropped_catches: row.fielding.dropped_catches,
          });
          if (res.error) errors.push(`fielding p${row.player_id}: ${res.error.message}`);
        }
      }
    }

    if (errors.length) {
      return jsonResponse({ ok: false, errors }, { status: 400 });
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
