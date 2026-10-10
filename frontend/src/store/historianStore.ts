// Canonical state store for historianStore
export const historianStoreStore = {
  state: {},
  getState() { return this.state; },
  setState(newState: any) { this.state = { ...this.state, ...newState }; }
};
