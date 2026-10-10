// Canonical state store for pcwStore
export const pcwStoreStore = {
  state: {},
  getState() { return this.state; },
  setState(newState: any) { this.state = { ...this.state, ...newState }; }
};
