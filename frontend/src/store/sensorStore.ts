// Canonical state store for sensorStore
export const sensorStoreStore = {
  state: {},
  getState() { return this.state; },
  setState(newState: any) { this.state = { ...this.state, ...newState }; }
};
