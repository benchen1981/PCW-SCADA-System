import type { SensorTag } from '../domain/sensorTypes';
import { initialPcwSubmains } from './pcwSubmains';

export const initialSensors: SensorTag[] = [];

initialPcwSubmains.forEach(sm => {
  const t = new Date().toISOString();
  
  // Default values
  let ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
  let ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
  let dpLimits = { lowLow: 0.0, low: 0.10, high: 0.50, highHigh: 0.60, baseline: 0.3 };
  let ptBase = 1.5;
  let ftBase = 180;
  let dpBase = 0.3;

  if (sm.systemId === 'PCW01' || sm.systemId === 'PCW02') {
    // PCW01 & PCW02: PT (1.2/1.3/1.5/1.7/1.8), FT (150/160/180/200/220), DP (0.0/0.1/0.3/0.5/0.6)
    ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
    ptBase = 1.5;
    ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
    ftBase = 180;
    dpLimits = { lowLow: 0.0, low: 0.10, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW03' || sm.systemId === 'PCW04') {
    // PCW03 & PCW04: PT (1.5/1.7/1.9/2.1/2.2), FT (150/160/180/200/220), DP (0.0/0.1/0.3/0.5/0.6)
    ptLimits = { lowLow: 1.50, low: 1.70, high: 2.10, highHigh: 2.20, baseline: 1.9 };
    ptBase = 1.9;
    ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
    ftBase = 180;
    dpLimits = { lowLow: 0.0, low: 0.10, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW05' || sm.systemId === 'PCW06') {
    // PCW05 & PCW06: PT (2.2/2.3/2.5/2.7/2.8), FT (230/240/260/280/300), DP (0.0/0.1/0.3/0.5/0.6)
    ptLimits = { lowLow: 2.20, low: 2.30, high: 2.70, highHigh: 2.80, baseline: 2.5 };
    ptBase = 2.5;
    ftLimits = { lowLow: 230, low: 240, high: 280, highHigh: 300, baseline: 260 };
    ftBase = 260;
    dpLimits = { lowLow: 0.0, low: 0.10, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW07' || sm.systemId === 'PCW08') {
    // PCW07 & PCW08: PT (1.9/2.0/2.2/2.4/2.5), FT (200/220/240/260/280), DP (0.0/0.1/0.3/0.5/0.6)
    ptLimits = { lowLow: 1.90, low: 2.00, high: 2.40, highHigh: 2.50, baseline: 2.2 };
    ptBase = 2.2;
    ftLimits = { lowLow: 200, low: 220, high: 260, highHigh: 280, baseline: 240 };
    ftBase = 240;
    dpLimits = { lowLow: 0.0, low: 0.10, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  }
  
  sm.supplyTags.forEach(tag => {
    const isFlow = tag.includes('FT');
    initialSensors.push({
      tagId: tag,
      displayTag: tag.split('.').pop() || '',
      systemId: sm.systemId,
      submainId: sm.submainId,
      measurementType: isFlow ? 'FLOW' : 'PRESSURE',
      position: 'SUPPLY',
      value: isFlow ? ftBase : ptBase,
      unit: isFlow ? 'LPM' : 'bar',
      quality: 'GOOD',
      source: 'SENSOR_SIMULATOR',
      timestamp: t,
      status: 'NORMAL',
      alarmState: 'NONE',
      alarmPriority: null,
      engineeringLimits: isFlow ? ftLimits : ptLimits
    });
  });
  
  sm.returnTags.forEach(tag => {
    const isDP = tag.includes('PDT');
    initialSensors.push({
      tagId: tag,
      displayTag: tag.split('.').pop() || '',
      systemId: sm.systemId,
      submainId: sm.submainId,
      measurementType: isDP ? 'DP' : 'PRESSURE',
      position: 'RETURN',
      value: isDP ? dpBase : ptBase,
      unit: 'bar',
      quality: 'GOOD',
      source: 'SENSOR_SIMULATOR',
      timestamp: t,
      status: 'NORMAL',
      alarmState: 'NONE',
      alarmPriority: null,
      engineeringLimits: isDP ? dpLimits : ptLimits
    });
  });
});
