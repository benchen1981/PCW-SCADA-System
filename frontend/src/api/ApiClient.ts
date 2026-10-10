import { API_CONFIG } from './config';
import type { HistorianRecord } from '../domain/historianTypes';
import type { AlarmEvent } from '../domain/alarmTypes';

/**
 * Real API Client for RESTful requests to the backend.
 */
class ApiClient {
  private baseUrl = API_CONFIG.REST_URL;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Historian Queries
  async getSensorHistory(tagIds: string[], startTime: string, endTime: string): Promise<HistorianRecord[]> {
    const params = new URLSearchParams();
    tagIds.forEach(id => params.append('tagId', id));
    params.append('startTime', startTime);
    params.append('endTime', endTime);
    return this.request<HistorianRecord[]>(`/historian?${params.toString()}`);
  }

  // Alarm Management
  async getActiveAlarms(): Promise<AlarmEvent[]> {
    return this.request<AlarmEvent[]>('/alarms/active');
  }

  async getAlarmHistory(startTime: string, endTime: string): Promise<AlarmEvent[]> {
    return this.request<AlarmEvent[]>(`/alarms/history?startTime=${startTime}&endTime=${endTime}`);
  }

  async acknowledgeAlarm(alarmId: string, user: string): Promise<void> {
    await this.request(`/alarms/${alarmId}/ack`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async acknowledgeAllAlarms(user: string): Promise<void> {
    await this.request(`/alarms/ack-all`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  // Configuration Sync
  async getPredictionConfig(): Promise<any> {
    return this.request<any>('/config/prediction');
  }

  async updatePredictionConfig(config: any): Promise<void> {
    await this.request('/config/prediction', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }
}

export const apiClient = new ApiClient();
