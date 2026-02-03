import { createClient } from "npm:@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BallByBall {
  id: string;
  match_id: number;
  innings: number;
  over_number: number;
  ball_number: number;
  batsman_id: number | null;
  bowler_id: number | null;
  runs_scored: number;
  extras_type: string | null;
  extras_runs: number;
  is_wicket: boolean;
  wicket_type: string | null;
  fielder_id: number | null;
  is_boundary: boolean;
}

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

    // Verify admin role
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roleData } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return jsonResponse({ error: "Admin role required" }, { status: 403 });
    }

    // Get match_id from request body
    const { match_id } = await req.json();
    if (!match_id || typeof match_id !== 'number') {
      return jsonResponse({ error: "match_id is required" }, { status: 400 });
    }

    console.log(`Finalizing match ${match_id}`);

    // Fetch all balls for this match
    const { data: balls, error: ballsError } = await client
      .from('ball_by_ball')
      .select('*')
      .eq('match_id', match_id)
      .order('innings')
      .order('over_number')
      .order('ball_number');

    if (ballsError) {
      console.error("Error fetching balls:", ballsError);
      return jsonResponse({ error: "Failed to fetch ball data" }, { status: 500 });
    }

    if (!balls || balls.length === 0) {
      return jsonResponse({ error: "No ball data found for this match" }, { status: 400 });
    }

    console.log(`Found ${balls.length} balls to process`);

    // Aggregate batting stats per player
    const battingStats = new Map<number, {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      out: boolean;
    }>();

    // Aggregate bowling stats per player
    const bowlingStats = new Map<number, {
      balls: number;
      runs_conceded: number;
      wickets: number;
      maidens: number;
      wides: number;
      no_balls: number;
      fours_conceded: number;
      sixes_conceded: number;
      dot_balls: number;
    }>();

    // Aggregate fielding stats per player
    const fieldingStats = new Map<number, {
      catches: number;
      runouts: number;
      stumpings: number;
    }>();

    // Track overs for maiden calculation
    const bowlerOvers = new Map<number, Map<number, { runs: number; legalBalls: number }>>();

    for (const ball of balls as BallByBall[]) {
      // Batting stats
      if (ball.batsman_id) {
        const existing = battingStats.get(ball.batsman_id) || {
          runs: 0, balls: 0, fours: 0, sixes: 0, out: false
        };

        // Count runs (don't count byes/leg byes as batsman runs)
        if (ball.extras_type !== 'bye' && ball.extras_type !== 'legbye') {
          existing.runs += ball.runs_scored;
        }

        // Count balls faced (exclude wides)
        if (ball.extras_type !== 'wide') {
          existing.balls++;
        }

        // Count boundaries
        if (ball.is_boundary && ball.runs_scored === 4) existing.fours++;
        if (ball.is_boundary && ball.runs_scored === 6) existing.sixes++;

        // Check if out
        if (ball.is_wicket) existing.out = true;

        battingStats.set(ball.batsman_id, existing);
      }

      // Bowling stats
      if (ball.bowler_id) {
        const existing = bowlingStats.get(ball.bowler_id) || {
          balls: 0, runs_conceded: 0, wickets: 0, maidens: 0,
          wides: 0, no_balls: 0, fours_conceded: 0, sixes_conceded: 0, dot_balls: 0
        };

        const isLegal = !ball.extras_type || (ball.extras_type !== 'wide' && ball.extras_type !== 'noball');
        if (isLegal) existing.balls++;

        // Runs conceded
        existing.runs_conceded += ball.runs_scored + ball.extras_runs;

        // Wickets (not run outs)
        if (ball.is_wicket && ball.wicket_type !== 'runout') existing.wickets++;

        // Extras
        if (ball.extras_type === 'wide') existing.wides++;
        if (ball.extras_type === 'noball') existing.no_balls++;

        // Boundaries conceded
        if (ball.is_boundary && ball.runs_scored === 4) existing.fours_conceded++;
        if (ball.is_boundary && ball.runs_scored === 6) existing.sixes_conceded++;

        // Dot balls
        if (ball.runs_scored === 0 && !ball.extras_type) existing.dot_balls++;

        bowlingStats.set(ball.bowler_id, existing);

        // Track overs for maidens
        if (!bowlerOvers.has(ball.bowler_id)) {
          bowlerOvers.set(ball.bowler_id, new Map());
        }
        const overKey = ball.innings * 100 + ball.over_number;
        const overData = bowlerOvers.get(ball.bowler_id)!;
        if (!overData.has(overKey)) {
          overData.set(overKey, { runs: 0, legalBalls: 0 });
        }
        const over = overData.get(overKey)!;
        over.runs += ball.runs_scored + ball.extras_runs;
        if (isLegal) over.legalBalls++;
      }

      // Fielding stats
      if (ball.is_wicket && ball.fielder_id) {
        const existing = fieldingStats.get(ball.fielder_id) || {
          catches: 0, runouts: 0, stumpings: 0
        };

        if (ball.wicket_type === 'caught') existing.catches++;
        if (ball.wicket_type === 'runout') existing.runouts++;
        if (ball.wicket_type === 'stumped') existing.stumpings++;

        fieldingStats.set(ball.fielder_id, existing);
      }
    }

    // Calculate maidens
    for (const [bowlerId, overs] of bowlerOvers) {
      const stats = bowlingStats.get(bowlerId);
      if (stats) {
        let maidens = 0;
        for (const [, overData] of overs) {
          if (overData.runs === 0 && overData.legalBalls >= 6) {
            maidens++;
          }
        }
        stats.maidens = maidens;
      }
    }

    const errors: string[] = [];

    // Insert/update batting inputs
    for (const [playerId, stats] of battingStats) {
      console.log(`Processing batting for player ${playerId}:`, stats);
      
      // Check if exists
      const { data: existing } = await client
        .from('batting_inputs')
        .select('id')
        .eq('match_id', match_id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        const { error } = await client
          .from('batting_inputs')
          .update({
            runs: stats.runs,
            balls: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            out: stats.out,
          })
          .eq('id', existing.id);
        if (error) errors.push(`batting update p${playerId}: ${error.message}`);
      } else {
        const { error } = await client
          .from('batting_inputs')
          .insert({
            match_id,
            player_id: playerId,
            runs: stats.runs,
            balls: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            out: stats.out,
          });
        if (error) errors.push(`batting insert p${playerId}: ${error.message}`);
      }
    }

    // Insert/update bowling inputs
    for (const [playerId, stats] of bowlingStats) {
      console.log(`Processing bowling for player ${playerId}:`, stats);
      
      const { data: existing } = await client
        .from('bowling_inputs')
        .select('id')
        .eq('match_id', match_id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        const { error } = await client
          .from('bowling_inputs')
          .update({
            balls: stats.balls,
            runs_conceded: stats.runs_conceded,
            wickets: stats.wickets,
            maidens: stats.maidens,
            wides: stats.wides,
            no_balls: stats.no_balls,
            fours_conceded: stats.fours_conceded,
            sixes_conceded: stats.sixes_conceded,
            dot_balls: stats.dot_balls,
          })
          .eq('id', existing.id);
        if (error) errors.push(`bowling update p${playerId}: ${error.message}`);
      } else {
        const { error } = await client
          .from('bowling_inputs')
          .insert({
            match_id,
            player_id: playerId,
            balls: stats.balls,
            runs_conceded: stats.runs_conceded,
            wickets: stats.wickets,
            maidens: stats.maidens,
            wides: stats.wides,
            no_balls: stats.no_balls,
            fours_conceded: stats.fours_conceded,
            sixes_conceded: stats.sixes_conceded,
            dot_balls: stats.dot_balls,
          });
        if (error) errors.push(`bowling insert p${playerId}: ${error.message}`);
      }
    }

    // Insert/update fielding inputs
    for (const [playerId, stats] of fieldingStats) {
      console.log(`Processing fielding for player ${playerId}:`, stats);
      
      const { data: existing } = await client
        .from('fielding_inputs')
        .select('id')
        .eq('match_id', match_id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        const { error } = await client
          .from('fielding_inputs')
          .update({
            catches: stats.catches,
            runouts: stats.runouts,
            stumpings: stats.stumpings,
          })
          .eq('id', existing.id);
        if (error) errors.push(`fielding update p${playerId}: ${error.message}`);
      } else {
        const { error } = await client
          .from('fielding_inputs')
          .insert({
            match_id,
            player_id: playerId,
            catches: stats.catches,
            runouts: stats.runouts,
            stumpings: stats.stumpings,
          });
        if (error) errors.push(`fielding insert p${playerId}: ${error.message}`);
      }
    }

    // Update live_match_state to completed
    await client
      .from('live_match_state')
      .update({ match_status: 'completed', is_live: false })
      .eq('match_id', match_id);

    if (errors.length > 0) {
      console.error("Errors during finalization:", errors);
      return jsonResponse({ 
        ok: false, 
        errors,
        processed: {
          batting: battingStats.size,
          bowling: bowlingStats.size,
          fielding: fieldingStats.size,
        }
      }, { status: 400 });
    }

    console.log("Match finalized successfully");
    return jsonResponse({ 
      ok: true,
      processed: {
        batting: battingStats.size,
        bowling: bowlingStats.size,
        fielding: fieldingStats.size,
      }
    });

  } catch (e) {
    console.error("Error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
