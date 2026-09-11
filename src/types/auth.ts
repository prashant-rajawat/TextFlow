export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginData {
  email: string;
  password: string;
}
