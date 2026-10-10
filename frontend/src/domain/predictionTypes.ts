export interface PredictionResult {
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
  triggerPath?: string;
}
