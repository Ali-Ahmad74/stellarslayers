import { useMemo } from "react";

interface PerformanceRecord {
  match_id: number;
  match_date: string;
  runs?: number;
  balls?: number;
  wickets?: number;
  runs_conceded?: number;
  bowling_balls?: number;
}

export interface FormDataPoint {
  match: number;
  date: string;
  runs: number;
  strikeRate: number;
  wickets: number;
  economy: number;
  rollingAvgRuns: number;
  rollingAvgWickets: number;
}

function calculateRollingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(Number(avg.toFixed(2)));
  }
  return result;
}

export function useFormAnalysis(
  battingRecords: PerformanceRecord[],
  bowlingRecords: PerformanceRecord[],
  windowSize = 5
) {
  return useMemo(() => {
    // Merge and sort by match_date
    const matchMap = new Map<number, { date: string; runs: number; balls: number; wickets: number; runsConceded: number; bowlingBalls: number }>();

    for (const b of battingRecords) {
      const existing = matchMap.get(b.match_id) || { date: b.match_date, runs: 0, balls: 0, wickets: 0, runsConceded: 0, bowlingBalls: 0 };
      existing.runs = b.runs ?? 0;
      existing.balls = b.balls ?? 0;
      existing.date = b.match_date;
      matchMap.set(b.match_id, existing);
    }

    for (const b of bowlingRecords) {
      const existing = matchMap.get(b.match_id) || { date: b.match_date, runs: 0, balls: 0, wickets: 0, runsConceded: 0, bowlingBalls: 0 };
      existing.wickets = b.wickets ?? 0;
      existing.runsConceded = b.runs_conceded ?? 0;
      existing.bowlingBalls = b.bowling_balls ?? b.balls ?? 0;
      existing.date = b.match_date;
      matchMap.set(b.match_id, existing);
    }

    const sorted = Array.from(matchMap.entries())
      .sort((a, b) => new Date(a[1].date).getTime() - new Date(b[1].date).getTime());

    const runsArr = sorted.map(([, v]) => v.runs);
    const wicketsArr = sorted.map(([, v]) => v.wickets);

    const rollingRuns = calculateRollingAverage(runsArr, windowSize);
    const rollingWickets = calculateRollingAverage(wicketsArr, windowSize);

    const formData: FormDataPoint[] = sorted.map(([matchId, data], idx) => {
      const sr = data.balls > 0 ? (data.runs / data.balls) * 100 : 0;
      const overs = data.bowlingBalls / 6;
      const eco = overs > 0 ? data.runsConceded / overs : 0;

      return {
        match: matchId,
        date: data.date,
        runs: data.runs,
        strikeRate: Number(sr.toFixed(1)),
        wickets: data.wickets,
        economy: Number(eco.toFixed(2)),
        rollingAvgRuns: rollingRuns[idx],
        rollingAvgWickets: rollingWickets[idx],
      };
    });

    // Consistency metrics
    const avgRuns = runsArr.length > 0 ? runsArr.reduce((a, b) => a + b, 0) / runsArr.length : 0;
    const variance = runsArr.length > 0 
      ? runsArr.reduce((acc, val) => acc + Math.pow(val - avgRuns, 2), 0) / runsArr.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    const consistency = avgRuns > 0 ? Math.max(0, 100 - (stdDev / avgRuns) * 100) : 0;

    // Recent form (last 5 matches)
    const recentRuns = runsArr.slice(-5);
    const recentAvg = recentRuns.length > 0 ? recentRuns.reduce((a, b) => a + b, 0) / recentRuns.length : 0;
    const formTrend = avgRuns > 0 ? ((recentAvg - avgRuns) / avgRuns) * 100 : 0;

    return {
      formData,
      stats: {
        averageRuns: Number(avgRuns.toFixed(1)),
        consistency: Number(consistency.toFixed(0)),
        formTrend: Number(formTrend.toFixed(1)),
        totalMatches: sorted.length,
      },
    };
  }, [battingRecords, bowlingRecords, windowSize]);
}
