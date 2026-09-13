import { UsageResponse } from '../types/usage';
import { tokenManager } from './tokenManager';
import { getApiBaseUrl } from './ttsService';

/**
 * Service to fetch and monitor user application usage records and limits.
 */
export async function fetchUserUsage(): Promise<UsageResponse> {
  const baseUrl = getApiBaseUrl();
  const token = tokenManager.getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/usage`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Failed to fetch usage information' };
    }
    throw new Error(errorData.message || `Usage request failed with status ${response.status}`);
  }

  const data: UsageResponse = await response.json();
  return data;
}
