import type { Operator } from "../types";

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  lt: "<",
  lte: "≤",
  gt: ">",
  gte: "≥",
  eq: "=",
  neq: "≠",
};

export const OPERATOR_OPTIONS: { value: Operator; symbol: string }[] = [
  { value: "gt", symbol: ">" },
  { value: "gte", symbol: "≥" },
  { value: "lt", symbol: "<" },
  { value: "lte", symbol: "≤" },
  { value: "eq", symbol: "=" },
  { value: "neq", symbol: "≠" },
];
