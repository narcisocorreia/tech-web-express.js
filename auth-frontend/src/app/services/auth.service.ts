import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../environments/environment';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl + '/auth';
  private tasksUrl = environment.apiUrl + '/tasks';

  // ── Token management ──────────────────────────────
  getToken() {
    return localStorage.getItem('token');
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  saveRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Invalida o refresh token no servidor (best-effort)
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  // ── Auth endpoints (headers geridos pelo interceptor) ──
  register(data: RegisterRequest) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data);
  }

  refreshAccessToken() {
    return this.http.post(`${this.apiUrl}/refresh`, {
      refreshToken: this.getRefreshToken(),
    });
  }

  getProfile() {
    return this.http.get(`${this.apiUrl}/me`);
  }

  updateProfile(data: UpdateProfileRequest) {
    return this.http.put(`${this.apiUrl}/profile`, data);
  }

  deleteProfile() {
    return this.http.delete(`${this.apiUrl}/profile`);
  }

  // ── Tasks ──────────────────────────────────────────
  getTasks(params: any) {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((k) => {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
        httpParams = httpParams.set(k, params[k]);
      }
    });
    return this.http.get(this.tasksUrl, { params: httpParams });
  }

  createTask(task: any) {
    return this.http.post(this.tasksUrl, task);
  }

  updateTask(id: number, task: any) {
    return this.http.put(`${this.tasksUrl}/${id}`, task);
  }

  deleteTask(id: number) {
    return this.http.delete(`${this.tasksUrl}/${id}`);
  }
}
