import type { PcwSubmain } from '../domain/pcwTypes';

export const initialPcwSubmains: PcwSubmain[] = [];

for (let i = 1; i <= 8; i++) {
  const systemId = `PCW0${i}`;
  for (let j = 1; j <= 10; j++) {
    const submainId = `Submain${String(j).padStart(2, '0')}`;
    const canonicalName = `${systemId}.${submainId}`;
    
    initialPcwSubmains.push({
      systemId,
      submainId,
      canonicalName,
      displayName: `SM-${String(j).padStart(2, '0')}`,
      supplyTags: [`${canonicalName}.PTS`, `${canonicalName}.FT`],
      returnTags: [`${canonicalName}.PTR`, `${canonicalName}.PDT`],
      pressureDifferential: 0.25,
      status: 'NORMAL',
      alarmState: 'NONE',
      lastUpdateTime: new Date().toISOString()
    });
  }
}
