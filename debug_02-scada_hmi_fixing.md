# Debug Log: SCADA HMI Implementation (V2.0)

## Issue 1: Vite Interactive Prompt Block
**Error Description:** When running `npx create-vite@latest scada-hmi --template react-ts`, the process hung waiting for user input regarding linter selection (ESLint vs Oxlint).
**Resolution:** Killed the background task and re-ran the command with the `--no-interactive` flag.

## Issue 2: Tailwind V3 vs V4 Configuration
**Error Description:** After installing TailwindCSS, the build failed with `Error: [postcss] It looks like you're trying to use tailwindcss directly as a PostCSS plugin...`. Vite 8.3 / Tailwind V4 changes the way plugins are handled.
**Resolution:** Since the design doc mandated a `tailwind.config.js` (Tailwind V3 style), installed `tailwindcss@3` explicitly along with `postcss` and `autoprefixer` to ensure strict compatibility with the user's provided color tokens.

## Issue 3: Project Context Misalignment
**Error Description:** The user requested "adding the new requirements to the existing version at `http://127.0.0.1:8000/`". The initial implementation mistakenly built a separate standalone Vite React App.
**Resolution:** 
1. Used `lsof -i:8000` to find the process ID.
2. Used `lsof -p PID | grep cwd` to locate the active project directory (`pcw-poc-v1_merged`).
3. Pivoted from React to Vanilla HTML/JS. Refactored the entire SVG HMI design into `app/web_api/static/index.html` using targeted replacements, preserving existing backend APIs (`/api/history`, `/api/health`).
