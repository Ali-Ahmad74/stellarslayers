import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { FormDataPoint } from "@/hooks/useFormAnalysis";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface FormAnalysisChartProps {
  data: FormDataPoint[];
  stats: {
    averageRuns: number;
    consistency: number;
    formTrend: number;
    totalMatches: number;
  };
  type?: "batting" | "bowling";
}

export function FormAnalysisChart({ data, stats, type = "batting" }: FormAnalysisChartProps) {
  const trendIcon = stats.formTrend > 5 ? (
    <TrendingUp className="w-4 h-4 text-success" />
  ) : stats.formTrend < -5 ? (
    <TrendingDown className="w-4 h-4 text-destructive" />
  ) : (
    <Minus className="w-4 h-4 text-muted-foreground" />
  );

  const trendColor = stats.formTrend > 5 ? "text-success" : stats.formTrend < -5 ? "text-destructive" : "text-muted-foreground";

  if (data.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Activity className="w-5 h-5 text-primary" />
            Form Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Not enough match data for form analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Activity className="w-5 h-5 text-primary" />
          Form Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.averageRuns}</p>
            <p className="text-xs text-muted-foreground">Avg Runs</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.consistency}%</p>
            <p className="text-xs text-muted-foreground">Consistency</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              {trendIcon}
              <span className={`text-2xl font-bold ${trendColor}`}>
                {stats.formTrend > 0 ? "+" : ""}{stats.formTrend}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Recent Form</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <Legend />
              {type === "batting" ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="runs" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    name="Runs"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rollingAvgRuns" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="5-Match Avg"
                  />
                </>
              ) : (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="wickets" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    name="Wickets"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rollingAvgWickets" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="5-Match Avg"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
