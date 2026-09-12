import { AuthResponse, LoginData, RegisterData, User } from '../types/auth';
import { getApiBaseUrl } from './ttsService';
import { tokenManager } from './tokenManager';

export async function registerApi(data: RegisterData): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: tokenManager.getAuthHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }),
    body: JSON.stringify(data),
    credentials: 'include',
  });

  const resData = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resData?.message || 'Registration failed. Please try again.';
    throw new Error(message);
  }

  if (resData?.token) {
    tokenManager.setToken(resData.token);
  }

  return resData;
}

export async function loginApi(data: LoginData): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: tokenManager.getAuthHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }),
    body: JSON.stringify(data),
    credentials: 'include',
  });

  const resData = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resData?.message || 'Invalid email or password.';
    throw new Error(message);
  }

  if (resData?.token) {
    tokenManager.setToken(resData.token);
  }

  return resData;
}

export async function getMeApi(): Promise<User | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const authHeaders = await tokenManager.getAuthHeadersAsync({
      'Accept': 'application/json',
    });
    const response = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: authHeaders,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.user) {
        return data.user;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}


export async function logoutApi(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  try {
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: tokenManager.getAuthHeaders({
        'Accept': 'application/json',
      }),
      credentials: 'include',
    });
  } catch (err) {
    console.warn('Logout API error:', err);
  } finally {
    tokenManager.clearToken();
  }
}
