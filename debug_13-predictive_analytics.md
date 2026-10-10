# Debug Log: Predictive Analytics Module Alignment (Phase 13)

## Issue 1: Simulating Past-Only History within a Fast-Ticking Simulator
**Error Description:** The T30/T20/T10 algorithm relies on 60 minutes of historical data (BaseAvg60, M60) and 10 minutes of recent data (M10) to calculate N10. However, the SimulatorEngine ticks every second in real-time, meaning we don't naturally have 70 minutes of data populated upon startup. Waiting 70 minutes for the dashboard to show data is unacceptable for a POC.
**Resolution:** Implemented an evidence approximation layer within the mock engine. Instead of querying 70 minutes of real history, the engine infers expected `M60`, `M10`, and `N10` values dynamically based on the current `Drift Slope` configured in the simulator. If a user sets a high drift slope, the engine forces the mock `N10` to exceed 2.0, thereby visually demonstrating the algorithm's reaction to anomaly density without requiring an hour of warm-up time.

## Issue 2: JSX Escaping in React Table Headers
**Error Description:** When adding the column header `N10 (Limit>2)`, the Vite build pipeline threw an unexpected token error: `Unexpected token. Did you mean {'>'} or &gt;?` because the unescaped `>` character within JSX is parsed as an invalid tag closure.
**Resolution:** Escaped the character using HTML entities `N10 (Limit &gt; 2)`. The build passed successfully immediately after the fix.
