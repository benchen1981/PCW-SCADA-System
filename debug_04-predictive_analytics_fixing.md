# Debug Log: Predictive Analytics Implementation (T30/T20/T10) (V4.0)

## Issue 1: Translating Complex Statistical Constraints into Frontend Mocking
**Constraint:** The development plan specifies a strict statistical model (`BaseAvg60`, `M60`, `M10`, `N10`) and a multi-horizon forecast (`Slope * 30/20/10`) that triggers warnings via a complex decision gate. It strictly forbids future data leakage.

**Resolution:** 
1. Simulated the temporal logic natively in JavaScript for the Web HMI to immediately demonstrate the visual hierarchy.
2. Carefully constructed the state machine in JS (`if (value >= 1.70) { state = "EVENT" } else if (f10 >= 1.70 || (n10 > 2 && value >= 1.62)) { state = "T-10" } ...`) to exactly match the target MS SQL Server logic defined in the V1 model.
3. This frontend-first approach validates the HMI space requirements and user-experience for operators before the heavy T-SQL stored procedures are developed.
