export interface AlarmEvent {
  alarmId: string;
  tagId: string;
  systemId: string;
  submainId: string;
  alarmType: 'HIGH_HIGH' | 'HIGH' | 'LOW' | 'LOW_LOW' | 'TRIP' | 'DRIFT' | 'ERROR';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  state: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK' | 'SHELVED';
  message: string;
  value: number;
  limit: number;
  unit: string;
  activatedAt: string;
  acknowledgedAt: string | null;
  clearedAt: string | null;
  acknowledgedBy: string | null;
  source: string;
}
