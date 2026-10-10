// Canonical state store for alarmStore
export const alarmStoreStore = {
  state: {},
  getState() { return this.state; },
  setState(newState: any) { this.state = { ...this.state, ...newState }; }
};
