import type { PcwSystem } from '../domain/pcwTypes';

const systemBaselines: Record<string, { sp: number; rp: number; dp: number; flow: number }> = {
  PCW01: { sp: 1.50, rp: 1.20, dp: 0.30, flow: 180.0 },
  PCW02: { sp: 1.50, rp: 1.20, dp: 0.30, flow: 180.0 },
  PCW03: { sp: 1.90, rp: 1.60, dp: 0.30, flow: 180.0 },
  PCW04: { sp: 1.90, rp: 1.60, dp: 0.30, flow: 180.0 },
  PCW05: { sp: 2.50, rp: 2.20, dp: 0.30, flow: 260.0 },
  PCW06: { sp: 2.50, rp: 2.20, dp: 0.30, flow: 260.0 },
  PCW07: { sp: 2.20, rp: 1.90, dp: 0.30, flow: 240.0 },
  PCW08: { sp: 2.20, rp: 1.90, dp: 0.30, flow: 240.0 },
};

export const initialPcwSystems: PcwSystem[] = Array.from({ length: 8 }).map((_, i) => {
  const sysId = `PCW0${i + 1}`;
  const base = systemBaselines[sysId] || { sp: 1.50, rp: 1.20, dp: 0.30, flow: 180.0 };
  return {
    systemId: sysId,
    systemName: `PCW System 0${i + 1}`,
    description: `Main Process Cooling Water Loop ${i + 1}`,
    status: 'ONLINE',
    health: 'HEALTHY',
    communicationStatus: 'CONNECTED',
    activeAlarmCount: 0,
    unacknowledgedAlarmCount: 0,
    driftSensorCount: 0,
    totalSensorCount: 40,
    supplyPressure: { min: base.sp, max: base.sp, avg: base.sp },
    returnPressure: { min: base.rp, max: base.rp, avg: base.rp },
    differentialPressure: { min: base.dp, max: base.dp, avg: base.dp },
    supplyTemperature: 20.0,
    returnTemperature: 25.0,
    flow: base.flow,
    lastUpdateTime: new Date().toISOString(),
    submains: Array.from({ length: 10 }).map((_, j) => `${sysId}.Submain${String(j + 1).padStart(2, '0')}`)
  };
});
