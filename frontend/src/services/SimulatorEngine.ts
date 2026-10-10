import { db } from '../repositories/MockDatabase';
import type { SensorTag } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';

export class SimulatorEngine {
  private static lastTickTime = Date.now();
  
  public static setControl(action: 'START' | 'PAUSE' | 'RESET', interval?: number): void {
    if (interval) db.simulatorStatus.updateIntervalMs = interval;
    
    if (action === 'PAUSE' || action === 'RESET') {
      if (db.simulatorIntervalId) clearInterval(db.simulatorIntervalId);
      db.simulatorStatus.isRunning = false;
    }
    
    if (action === 'RESET') {
      db.simulatorStatus.iteration = 0;
      db.historian = [];
      db.alarms = [];
      db.predictions = [];
      Object.keys(db.simulatorConfigs).forEach(tag => {
        const conf = db.simulatorConfigs[tag];
        conf.driftSlope = 0;
        conf.stepChange = 0;
        conf.spike = 0;
        conf.badQuality = false;
        conf.commLoss = false;
      });
      // Seed historian with 70 historical points (1 per minute) so predictions work immediately
      const nowMs = Date.now();
      db.sensors.forEach(sensor => {
        for (let i = 70; i > 0; i--) {
            db.historian.push({
                tagId: sensor.tagId,
                timestamp: new Date(nowMs - i * 60000).toISOString(),
                value: sensor.engineeringLimits.baseline ?? ((sensor.engineeringLimits.high + sensor.engineeringLimits.low) / 2),
                quality: 'GOOD'
            });
        }
      });
    }

    if (action === 'START') {
      if (db.simulatorIntervalId) clearInterval(db.simulatorIntervalId);
      db.simulatorStatus.isRunning = true;
      this.lastTickTime = Date.now();
      db.simulatorIntervalId = setInterval(() => this.runTick(), db.simulatorStatus.updateIntervalMs);
    }
  }

  private static evaluateAlarms(sensor: SensorTag, timestamp: string) {
    const limits = sensor.engineeringLimits;
    const check = (type: AlarmEvent['alarmType'], condition: boolean, priority: AlarmEvent['priority'], msg: string) => {
      const existing = db.alarms.find(a => a.tagId === sensor.tagId && a.alarmType === type && a.state.startsWith('ACTIVE'));
      if (condition) {
        if (!existing) {
          db.alarms.push({
            alarmId: `ALM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            tagId: sensor.tagId, systemId: sensor.systemId, submainId: sensor.submainId,
            alarmType: type, priority, state: 'ACTIVE_UNACK', message: msg,
            value: sensor.value, limit: type.includes('HIGH') ? limits.high : limits.low,
            unit: sensor.unit, activatedAt: timestamp, acknowledgedAt: null, clearedAt: null, acknowledgedBy: null, source: 'ALARM_ENGINE'
          });
        } else {
          // Update live value in the alarm summary for ACTIVE alarms
          existing.value = sensor.value;
        }
      } else {
        if (existing) {
          existing.state = existing.state === 'ACTIVE_UNACK' ? 'CLEARED_UNACK' : 'CLEARED_ACK';
          existing.clearedAt = timestamp;
          // We don't update value here; it locks the value at clearance.
        }
      }
    };
    check('HIGH_HIGH', sensor.value >= limits.highHigh, 'CRITICAL', `${sensor.tagId} HIGH-HIGH`);
    check('HIGH', sensor.value >= limits.high && sensor.value < limits.highHigh, 'HIGH', `${sensor.tagId} HIGH`);
    check('LOW', sensor.value <= limits.low && sensor.value > limits.lowLow, 'HIGH', `${sensor.tagId} LOW`);
    check('LOW_LOW', sensor.value <= limits.lowLow, 'CRITICAL', `${sensor.tagId} LOW-LOW`);

    const activeAlarm = db.alarms.find(a => a.tagId === sensor.tagId && a.state.startsWith('ACTIVE'));
    if (activeAlarm) {
      sensor.alarmState = activeAlarm.state;
      sensor.status = 'ALARM';
      sensor.alarmPriority = activeAlarm.priority;
    } else {
      sensor.alarmState = 'NONE';
      sensor.status = 'NORMAL';
      sensor.alarmPriority = null;
    }
  }

  private static runTick() {
    const nowTime = Date.now();
    let elapsed = nowTime - this.lastTickTime;
    this.lastTickTime = nowTime;
    
    let ticksToRun = Math.round(elapsed / db.simulatorStatus.updateIntervalMs);
    if (ticksToRun < 1) ticksToRun = 1;
    if (ticksToRun > 600) ticksToRun = 600; // Cap catch-up at 10 minutes to prevent browser freeze

    for (let i = 0; i < ticksToRun; i++) {
      this.processTick();
    }
  }

  private static processTick() {
    db.simulatorStatus.iteration++;
    const now = new Date().toISOString();

    db.sensors.forEach(sensor => {
      const conf = db.simulatorConfigs[sensor.tagId];
      if (!conf) return; 

      const noiseVal = (Math.random() - 0.5) * conf.noise;
      let newVal = conf.baseValue + noiseVal;

      sensor.value = newVal;
      sensor.quality = 'GOOD';
      sensor.status = 'NORMAL';

      // 2. Update ModbusRegisterRepository
      const regDef = db.modbusMap.find(m => m.tagId === sensor.tagId);
      if (regDef) {
        db.modbusRegisters[regDef.registerAddress] = {
          registerAddress: regDef.registerAddress,
          rawValue: newVal * regDef.scale,
          engineeringValue: newVal,
          quality: sensor.quality,
          lastUpdate: now
        };
      }

      // 3. Write to Historian (1 point per simulated minute per tag to save memory)
      if (db.simulatorStatus.iteration % 60 === 0 || db.simulatorStatus.iteration === 1) {
        db.historian.push({ tagId: sensor.tagId, timestamp: now, value: newVal, quality: sensor.quality });
        if (db.historian.length > 200000) db.historian.shift(); // Keep bounded
      }

      // 4. Run Alarm Engine
      if (!conf.badQuality) {
        this.evaluateAlarms(sensor, now);
      }
    });

    // 5. Update Predictions (Run every 1 simulated minute)
    if (db.simulatorStatus.iteration % 60 === 0 || db.predictions.length === 0) {
      db.predictions = db.sensors.map(s => {
        // Check enablement
        const pcfg = db.predictionConfig;
        const isEnabled = pcfg.global 
          && pcfg.systems[s.systemId] !== false 
          && pcfg.submains[s.submainId] !== false 
          && pcfg.sensors[s.tagId] !== false;

        if (!isEnabled) {
          return {
            tagId: s.tagId, evaluationTime: now, baseAvg60: 0, currentValue: s.value,
            m60: 0, m10: 0, n10: 0, slope: 0, forecast30: 0, forecast20: 0, forecast10: 0, 
            state: 'DISABLED',
            triggerPath: `[Hold] ENGINE_DISABLED (Configured OFF)`
          } as any;
        }

      let history = db.historian.filter(h => h.tagId === s.tagId);
      
      if (history.length < 70) { // Require at least 70 minutes of data (1 point per min)
        return {
          tagId: s.tagId, evaluationTime: now, baseAvg60: 0, currentValue: s.value,
          m60: 0, m10: 0, n10: 0, slope: 0, forecast30: 0, forecast20: 0, forecast10: 0, 
          state: 'NORMAL',
          triggerPath: `[Hold] INSUFFICIENT_DATA (Need 70 points, currently have ${history.length})`
        } as any;
      }

      // We expect 1 point per minute. 
      // t-70min to t-10min = history.slice(-70, -10)
      // t-10min to t-5min = history.slice(-10, -5)
      // t-5min to t = history.slice(-5)
      
      const slice70to10 = history.slice(-70, -10);
      const slice10to5 = history.slice(-10, -5);
      const slice5to0 = history.slice(-5);

      const mean = (arr: any[]) => arr.length ? arr.reduce((a, b) => a + b.value, 0) / arr.length : 0;

      const baseAvg60 = mean(slice70to10);
      const prev5Avg = mean(slice10to5);
      const recent5Avg = mean(slice5to0);

      const slope = (recent5Avg - prev5Avg) / 5;

      const isUp = slope >= 0;
      const m60 = slice70to10.filter(p => isUp ? (p.value > baseAvg60) : (p.value < baseAvg60)).length;
      const m10 = history.slice(-10).filter(p => isUp ? (p.value > baseAvg60) : (p.value < baseAvg60)).length;

      let n10 = 0;
      if (m60 === 0 && m10 > 0) n10 = 999;
      else if (m60 === 0 && m10 === 0) n10 = 0;
      else n10 = m10 / (m60 / 6);

      const forecast30 = s.value + slope * 30;
      const forecast20 = s.value + slope * 20;
      const forecast10 = s.value + slope * 10;

      let state = 'NORMAL';
      let triggerPath = '';
      
      const limitHH = s.engineeringLimits.highHigh;
      const limitH = s.engineeringLimits.high;
      const limitL = s.engineeringLimits.low;
      const limitLL = s.engineeringLimits.lowLow;

      const checkLimit = (val: number) => {
        if (val >= limitHH) return `HH (${limitHH})`;
        if (val >= limitH) return `H (${limitH})`;
        if (val <= limitLL) return `LL (${limitLL})`;
        if (val <= limitL) return `L (${limitL})`;
        return null;
      };

      const hit10 = checkLimit(forecast10);
      const hit20 = checkLimit(forecast20);
      const hit30 = checkLimit(forecast30);
      const sensitivity = db.predictionConfig.sensorSensitivity?.[s.tagId] ?? db.predictionConfig.sensitivity ?? 2;
      const isDrifting = n10 > sensitivity && Math.abs(slope) > 0.001;

      if (hit10) {
        state = 'T-10';
        triggerPath = `Fcst10 (${forecast10.toFixed(2)}) reaches ${hit10} ➔ ALARM`;
      } else if (hit20) {
        state = 'T-20';
        triggerPath = `Fcst20 (${forecast20.toFixed(2)}) reaches ${hit20} ➔ WARN`;
      } else if (hit30) {
        state = 'T-30';
        triggerPath = `Fcst30 (${forecast30.toFixed(2)}) reaches ${hit30} ➔ WARN`;
      } else if (isDrifting) {
        state = 'T-30';
        triggerPath = `Density (N10 > ${sensitivity}) & Drifting ➔ WARN (Behavior Shift)`;
      } else {
        triggerPath = `Forecasts normal, No Drift ➔ STABLE`;
      }

      // Record prediction features into Historian so users can trend them
      db.historian.push({ tagId: `${s.tagId}_BaseAvg60`, timestamp: now, value: baseAvg60, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_M60`, timestamp: now, value: m60, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_M10`, timestamp: now, value: m10, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_N10`, timestamp: now, value: n10, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_Slope`, timestamp: now, value: slope, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_Fcst30`, timestamp: now, value: forecast30, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_Fcst20`, timestamp: now, value: forecast20, quality: 'GOOD' });
      db.historian.push({ tagId: `${s.tagId}_Fcst10`, timestamp: now, value: forecast10, quality: 'GOOD' });

      return {
        tagId: s.tagId, evaluationTime: now, baseAvg60, currentValue: s.value,
        m60, m10, n10, slope, forecast30, forecast20, forecast10, state, triggerPath
      } as any;
    });
    }

    // Submains/Systems aggregation
    db.systems.forEach(sys => {
      const sysSensors = db.sensors.filter(s => s.systemId === sys.systemId);
      const supplySensors = sysSensors.filter(s => s.position === 'SUPPLY');
      const returnSensors = sysSensors.filter(s => s.position === 'RETURN');

      const calcStats = (sensors: typeof db.sensors) => {
        if (sensors.length === 0) return { min: 0, max: 0, avg: 0 };
        const vals = sensors.map(s => s.value);
        return {
          min: Math.min(...vals),
          max: Math.max(...vals),
          avg: vals.reduce((a, b) => a + b, 0) / vals.length
        };
      };

      const supplyStats = calcStats(supplySensors);
      const returnStats = calcStats(returnSensors);
      
      const dpVals = supplySensors.map(s => {
        const ret = returnSensors.find(r => r.submainId === s.submainId);
        return ret ? s.value - ret.value : 0;
      });
      const dpStats = {
        min: Math.min(...dpVals) || 0,
        max: Math.max(...dpVals) || 0,
        avg: dpVals.length ? dpVals.reduce((a, b) => a + b, 0) / dpVals.length : 0
      };

      const sysAlarms = db.alarms.filter(a => a.systemId === sys.systemId && a.state.startsWith('ACTIVE'));
      sys.activeAlarmCount = sysAlarms.length;
      sys.unacknowledgedAlarmCount = sysAlarms.filter(a => a.state.includes('UNACK')).length;
      sys.supplyPressure = supplyStats;
      sys.returnPressure = returnStats;
      sys.differentialPressure = dpStats;
      sys.lastUpdateTime = now;
    });

    // 7. Persist to localStorage
    // Doing it every 5 iterations to save some performance, or every tick. Every tick is fine for POC.
    if (db.simulatorStatus.iteration % 5 === 0) {
      db.persist();
    }
  }
}
