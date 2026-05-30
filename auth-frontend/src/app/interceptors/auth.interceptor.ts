import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isPublic = PUBLIC_ENDPOINTS.some((e) => req.url.includes(e));
  const token = authService.getToken();

  // Adiciona o token a todos os pedidos protegidos
  const authReq =
    token && !isPublic
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error) => {
      // Se o pedido falhar com 401 e tivermos refresh token, tentamos renovar
      if (error.status === 401 && !isPublic && authService.getRefreshToken()) {
        return authService.refreshAccessToken().pipe(
          switchMap((response: any) => {
            authService.saveToken(response.accessToken);
            // Repete o pedido original com o novo access token
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` },
            });
            return next(retried);
          }),
          catchError((refreshError) => {
            // Refresh falhou — sessão expirada, redireciona para login
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
