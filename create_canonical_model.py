import os
from pathlib import Path

# Directories to create
dirs = [
    "src/domain",
    "src/data",
    "src/services",
    "src/store",
    "src/selectors"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

# -----------------
# DOMAIN (Types)
# -----------------
pcwTypes = """export interface PcwSystem {
  systemId: string;
  systemName: string;
  description: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  communicationStatus: 'CONNECTED' | 'DISCONNECTED';
  activeAlarmCount: number;
  unacknowledgedAlarmCount: number;
  driftSensorCount: number;
  totalSensorCount: number;
  supplyPressure: number;
  returnPressure: number;
  differentialPressure: number;
  supplyTemperature: number;
  returnTemperature: number;
  flow: number;
  lastUpdateTime: string;
  submains: string[]; // references to submainIds
}

export interface PcwSubmain {
  systemId: string;
  submainId: string;
  canonicalName: string;
  displayName: string;
  supplyTags: string[]; // references to tagIds
  returnTags: string[]; // references to tagIds
  pressureDifferential: number;
  status: 'NORMAL' | 'WARNING' | 'ALARM';
  alarmState: string;
  lastUpdateTime: string;
}
"""

sensorTypes = """export interface EngineeringLimits {
  lowLow: number;
  low: number;
  high: number;
  highHigh: number;
}

export interface SensorTag {
  tagId: string;
  displayTag: string;
  systemId: string;
  submainId: string;
  measurementType: 'PRESSURE' | 'TEMPERATURE' | 'FLOW' | 'LEVEL';
  position: 'SUPPLY' | 'RETURN' | 'TANK' | 'PUMP';
  value: number;
  unit: string;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  source: 'SENSOR_SIMULATOR' | 'PLC' | 'HISTORIAN';
  timestamp: string;
  status: 'NORMAL' | 'WARNING' | 'ALARM' | 'ERROR';
  alarmState: 'NONE' | 'HIHI' | 'HI' | 'LO' | 'LOLO';
  alarmPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  engineeringLimits: EngineeringLimits;
}
"""

alarmTypes = """export interface AlarmEvent {
  alarmId: string;
  tagId: string;
  timestamp: string;
  type: 'HIHI' | 'HI' | 'LO' | 'LOLO' | 'TRIP' | 'SYSTEM';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
"""

historianTypes = """export interface HistorianRecord {
  tagId: string;
  timestamp: string;
  value: number;
  quality: string;
}
"""

predictionTypes = """export interface PredictionResult {
  tagId: string;
  evaluationTime: string;
  baseAvg60: number;
  m60: number;
  m10: number;
  n10: number;
  slope: number;
  forecast30: number;
  forecast20: number;
  forecast10: number;
  state: 'NORMAL' | 'T-30' | 'T-20' | 'T-10' | 'EVENT';
}
"""

simulatorTypes = """export interface SimulatorConfig {
  tagId: string;
  enabled: boolean;
  baseValue: number;
  noiseStd: number;
  driftRate: number;
  driftEnabled: boolean;
}
"""

# Write Domain Files
with open("src/domain/pcwTypes.ts", "w") as f: f.write(pcwTypes)
with open("src/domain/sensorTypes.ts", "w") as f: f.write(sensorTypes)
with open("src/domain/alarmTypes.ts", "w") as f: f.write(alarmTypes)
with open("src/domain/historianTypes.ts", "w") as f: f.write(historianTypes)
with open("src/domain/predictionTypes.ts", "w") as f: f.write(predictionTypes)
with open("src/domain/simulatorTypes.ts", "w") as f: f.write(simulatorTypes)


# -----------------
# DATA (Initial/Mock state conforming strictly to canonical model)
# -----------------
pcwSystemsData = """import { PcwSystem } from '../domain/pcwTypes';

export const initialPcwSystems: PcwSystem[] = Array.from({ length: 8 }).map((_, i) => ({
  systemId: `PCW0${i + 1}`,
  systemName: `PCW System 0${i + 1}`,
  description: `Main Process Cooling Water Loop ${i + 1}`,
  status: 'ONLINE',
  health: 'HEALTHY',
  communicationStatus: 'CONNECTED',
  activeAlarmCount: 0,
  unacknowledgedAlarmCount: 0,
  driftSensorCount: 0,
  totalSensorCount: 40,
  supplyPressure: 1.45,
  returnPressure: 1.20,
  differentialPressure: 0.25,
  supplyTemperature: 20.0,
  returnTemperature: 25.0,
  flow: 1000.0,
  lastUpdateTime: new Date().toISOString(),
  submains: Array.from({ length: 20 }).map((_, j) => `PCW0${i + 1}.Submain${String(j + 1).padStart(2, '0')}`)
}));
"""

pcwSubmainsData = """import { PcwSubmain } from '../domain/pcwTypes';

export const initialPcwSubmains: PcwSubmain[] = [];

for (let i = 1; i <= 8; i++) {
  const systemId = `PCW0${i}`;
  for (let j = 1; j <= 20; j++) {
    const submainId = `Submain${String(j).padStart(2, '0')}`;
    const canonicalName = `${systemId}.${submainId}`;
    
    initialPcwSubmains.push({
      systemId,
      submainId,
      canonicalName,
      displayName: `SM-${String(j).padStart(2, '0')}`,
      supplyTags: [`${canonicalName}.PT1S`, `${canonicalName}.PT2S`],
      returnTags: [`${canonicalName}.PT1R`, `${canonicalName}.PT2R`],
      pressureDifferential: 0.25,
      status: 'NORMAL',
      alarmState: 'NONE',
      lastUpdateTime: new Date().toISOString()
    });
  }
}
"""

sensorDefinitionsData = """import { SensorTag } from '../domain/sensorTypes';
import { initialPcwSubmains } from './pcwSubmains';

export const initialSensors: SensorTag[] = [];

initialPcwSubmains.forEach(sm => {
  const t = new Date().toISOString();
  const baseLimits = { lowLow: 1.00, low: 1.20, high: 1.70, highHigh: 1.90 };
  
  sm.supplyTags.forEach(tag => {
    initialSensors.push({
      tagId: tag,
      displayTag: tag.split('.').pop() || '',
      systemId: sm.systemId,
      submainId: sm.submainId,
      measurementType: 'PRESSURE',
      position: 'SUPPLY',
      value: 1.45,
      unit: 'bar',
      quality: 'GOOD',
      source: 'SENSOR_SIMULATOR',
      timestamp: t,
      status: 'NORMAL',
      alarmState: 'NONE',
      alarmPriority: null,
      engineeringLimits: baseLimits
    });
  });
  
  sm.returnTags.forEach(tag => {
    initialSensors.push({
      tagId: tag,
      displayTag: tag.split('.').pop() || '',
      systemId: sm.systemId,
      submainId: sm.submainId,
      measurementType: 'PRESSURE',
      position: 'RETURN',
      value: 1.20,
      unit: 'bar',
      quality: 'GOOD',
      source: 'SENSOR_SIMULATOR',
      timestamp: t,
      status: 'NORMAL',
      alarmState: 'NONE',
      alarmPriority: null,
      engineeringLimits: baseLimits
    });
  });
});
"""

alarmDefinitionsData = """import { AlarmEvent } from '../domain/alarmTypes';

export const initialAlarms: AlarmEvent[] = [];
"""

# Write Data Files
with open("src/data/pcwSystems.ts", "w") as f: f.write(pcwSystemsData)
with open("src/data/pcwSubmains.ts", "w") as f: f.write(pcwSubmainsData)
with open("src/data/sensorDefinitions.ts", "w") as f: f.write(sensorDefinitionsData)
with open("src/data/alarmDefinitions.ts", "w") as f: f.write(alarmDefinitionsData)


# -----------------
# SERVICES (Stubs)
# -----------------
def generate_service(name):
    return f"""export class {name} {{
  // Service implementation for fetching and managing {name.replace('Service', '')} data
}}
export const {name.lower()}Instance = new {name}();
"""

services = ["PcwDataService", "SensorService", "AlarmService", "HistorianService", "ModbusService", "SimulatorService", "PredictionService"]
for s in services:
    with open(f"src/services/{s}.ts", "w") as f: f.write(generate_service(s))


# -----------------
# STORES (Stubs)
# -----------------
def generate_store(name):
    return f"""// Canonical state store for {name}
export const {name}Store = {{
  state: {{}},
  getState() {{ return this.state; }},
  setState(newState: any) {{ this.state = {{ ...this.state, ...newState }}; }}
}};
"""

stores = ["pcwStore", "sensorStore", "alarmStore", "historianStore", "simulatorStore"]
for s in stores:
    with open(f"src/store/{s}.ts", "w") as f: f.write(generate_store(s))


# -----------------
# SELECTORS (Stubs)
# -----------------
def generate_selector(name):
    return f"""// Selectors for {name}
export const selectAll{name.capitalize()} = (state: any) => state.{name};
"""

selectors = ["pcwSelectors", "sensorSelectors", "alarmSelectors"]
for s in selectors:
    with open(f"src/selectors/{s}.ts", "w") as f: f.write(generate_selector(s))

print("Canonical data model architecture created successfully in src/")
