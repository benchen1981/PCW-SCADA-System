import { initialSensors } from './sensorDefinitions';
import type { ModbusRegisterDefinition } from '../domain/modbusTypes';

export const initialModbusMap: ModbusRegisterDefinition[] = [];

let addressCounter = 40001;

initialSensors.forEach(sensor => {
  initialModbusMap.push({
    registerAddress: addressCounter,
    tagId: sensor.tagId,
    dataType: 'FLOAT32',
    unit: sensor.unit,
    scale: 1,
    min: sensor.engineeringLimits.lowLow,
    max: sensor.engineeringLimits.highHigh,
    access: 'READ_ONLY',
    source: 'SENSOR_SIMULATOR'
  });
  addressCounter += 2; // FLOAT32 takes 2 registers
});
