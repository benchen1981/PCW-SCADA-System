// Canonical state store for simulatorStore
export const simulatorStoreStore = {
  state: {},
  getState() { return this.state; },
  setState(newState: any) { this.state = { ...this.state, ...newState }; }
};
