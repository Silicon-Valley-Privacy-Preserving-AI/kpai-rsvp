// Local ambient stub so tsc resolves 'recharts' in the dev VM.
// Docker's npm install provides the real package with proper types.
declare module "recharts" {
  import type { ReactNode, CSSProperties } from "react";
  export const BarChart: any;
  export const Bar: any;
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const ResponsiveContainer: any;
  export const Legend: any;
  export const ReferenceLine: any;
  export const Cell: any;
}
