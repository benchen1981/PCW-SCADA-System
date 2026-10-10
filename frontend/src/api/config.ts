export const API_CONFIG = {
  // Use Vite environment variables, fallback to local dev server
  REST_URL: import.meta.env.VITE_API_REST_URL || 'http://localhost:3000/api',
  WS_URL: import.meta.env.VITE_API_WS_URL || 'ws://localhost:3000/ws',
  
  // Feature flag to switch between mock engine and real backend
  USE_MOCK: import.meta.env.VITE_USE_MOCK !== 'false', // Default to true if not specified
};
