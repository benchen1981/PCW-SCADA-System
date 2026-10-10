import type { SensorTag } from '../domain/sensorTypes';
import { initialPcwSubmains } from './pcwSubmains';

export const initialSensors: SensorTag[] = [];

initialPcwSubmains.forEach(sm => {
  const t = new Date().toISOString();
  let ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
  let ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
  let dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
  let ptBase = 1.5;
  let ftBase = 180;
  let dpBase = 0.3;

  if (sm.systemId === 'PCW01' || sm.systemId === 'PCW02') {
    ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
    ptBase = 1.5;
    ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
    ftBase = 180;
    dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW03' || sm.systemId === 'PCW04') {
    ptLimits = { lowLow: 1.50, low: 1.70, high: 2.10, highHigh: 2.20, baseline: 1.9 };
    ptBase = 1.9;
    ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
    ftBase = 180;
    dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW05' || sm.systemId === 'PCW06') {
    ptLimits = { lowLow: 2.20, low: 2.30, high: 2.70, highHigh: 2.80, baseline: 2.5 };
    ptBase = 2.5;
    ftLimits = { lowLow: 230, low: 240, high: 280, highHigh: 300, baseline: 260 };
    ftBase = 260;
    dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
    dpBase = 0.3;
  } else if (sm.systemId === 'PCW07' || sm.systemId === 'PCW08') {
    ptLimits = { lowLow: 1.90, low: 2.00, high: 2.40, highHigh: 2.50, baseline: 2.2 };
    ptBase = 2.2;
    ftLimits = { lowLow: 200, low: 220, high: 260, highHigh: 280, baseline: 240 };
    ftBase = 240;
    dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
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
