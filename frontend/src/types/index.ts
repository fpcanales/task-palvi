export type Severity = "critical" | "warning" | "positive";

export type Operator = "lt" | "lte" | "gt" | "gte" | "eq" | "neq";

export type Direction = "higher_is_better" | "lower_is_better";

export type Sentiment = "good" | "bad" | "neutral";

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  direction: Direction;
  description: string;
}

export interface DayValues {
  date: string;
  values: Record<string, number | null>;
}

export interface Dataset {
  metadata: {
    id: string;
    label: string;
    narrative: string;
    dateRange: { from: string; to: string };
    metrics: MetricDefinition[];
  };
  days: DayValues[];
}

export interface DatasetListItem {
  id: string;
  label: string;
  narrative: string;
  dateRange: { from: string; to: string };
}

export interface Alarm {
  id: number;
  title: string;
  metric_key: string;
  operator: Operator;
  threshold: number;
  severity: Severity;
  position: number;
  triggered: boolean;
  current_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface AlarmInput {
  title: string;
  metric_key: string;
  operator: Operator;
  threshold: number;
  severity: Severity;
  position?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in_seconds: number;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export interface KPI {
  key: string;
  label: string;
  unit: string;
  direction: Direction;
  current: number | null;
  weekDeltaPct: number | null;
  prior: number | null;
  sentiment: Sentiment;
  spark: (number | null)[];
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number | null;
  prior: number;
  valueDeltaPct: number | null;
  conversionFromPrev: number | null;
  conversionPrior: number | null;
  conversionDeltaPct: number | null;
}
