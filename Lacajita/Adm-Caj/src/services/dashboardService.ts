import apiClient from './apiClient';

export interface CustomersSummary {
  total: number;
  active_last_30d: number;
  new_last_30d: number;
  blocked: number;
  verified: number;
  unverified: number;
}

export interface LoginStats {
  total_logins: number;
  avg_logins_per_user: number;
  last_7d_logins_estimate: number;
  users_with_0_logins: number;
}

export interface SystemSummary {
  users_total: number;
  users_verified: number;
  users_blocked: number;
  playlists: number;
  videos: number;
  seasons: number;
}

export interface DemographicResponse {
  by_domain: Record<string, number>;
  by_identity_provider: Record<string, number>;
  signups_by_month: Record<string, number>;
  by_country?: Record<string, number>;
}

export interface VideoConsumptionSummary {
  total_events: number;
  plays: number;
  completes: number;
  unique_users: number;
  total_seconds_watched_estimate: number;
  top_videos: Array<{ media_id: string; plays: number; completes: number; events: number }>;
  last_7d: Array<{ d: string; events: number; plays: number }>;
}

class DashboardService {
  async getCustomersSummary(): Promise<CustomersSummary> {
    const { data } = await apiClient.get<CustomersSummary>('/dashboard/customers-summary');
    return data;
  }

  async getLoginStats(): Promise<LoginStats> {
    const { data } = await apiClient.get<LoginStats>('/dashboard/login-stats');
    return data;
  }

  async getSystemSummary(): Promise<SystemSummary> {
    const { data } = await apiClient.get<SystemSummary>('/dashboard/system-summary');
    return data;
  }

  async getDemographic(): Promise<DemographicResponse> {
    const { data } = await apiClient.get<DemographicResponse>('/dashboard/customers-demographic');
    return data;
  }

  async getVideoConsumption(days = 30): Promise<VideoConsumptionSummary> {
    const { data } = await apiClient.get<VideoConsumptionSummary>(`/dashboard/video-consumption?days=${days}`);
    return data;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
