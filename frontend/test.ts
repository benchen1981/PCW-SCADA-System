import { initialSensors } from './src/data/sensorDefinitions';
const counts = {};
initialSensors.forEach(s => {
  counts[s.tagId] = (counts[s.tagId] || 0) + 1;
});
console.log(Object.keys(counts).filter(k => counts[k] > 1));
