import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  message = '';
  errors: { email?: string; password?: string } = {};
  isLoading = false;
  showPassword = false;

  private validate(): boolean {
    this.errors = {};

    if (!this.email.trim()) this.errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
      this.errors.email = 'Invalid email format';

    if (!this.password) this.errors.password = 'Password is required';

    return Object.keys(this.errors).length === 0;
  }

  login() {
    if (!this.validate()) return;
    this.isLoading = true;
    this.message = '';

    this.authService
      .login({
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.authService.saveToken(response.token);
          this.authService.saveRefreshToken(response.refreshToken);
          this.router.navigate(['/profile']);
        },
        error: (error) => {
          this.message = error.error?.message || 'Login failed';
          this.isLoading = false;
        },
      });
  }
}
