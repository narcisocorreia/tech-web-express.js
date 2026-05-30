import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  message = '';
  errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  private validate(): boolean {
    this.errors = {};

    if (!this.name.trim()) this.errors.name = 'Name is required';

    if (!this.email.trim()) this.errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
      this.errors.email = 'Invalid email format';

    if (!this.password) {
      this.errors.password = 'Password is required';
    } else if (this.password.length < 8) {
      this.errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(this.password)) {
      this.errors.password =
        'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(this.password)) {
      this.errors.password = 'Password must contain at least one number';
    } else if (!/[^A-Za-z0-9]/.test(this.password)) {
      this.errors.password =
        'Password must contain at least one special character';
    }

    if (!this.confirmPassword) {
      this.errors.confirmPassword = 'Please confirm your password';
    } else if (
      this.password &&
      !this.errors.password &&
      this.confirmPassword !== this.password
    ) {
      this.errors.confirmPassword = 'Passwords do not match';
    }

    return Object.keys(this.errors).length === 0;
  }

  register() {
    if (!this.validate()) return;
    this.isLoading = true;
    this.message = '';

    this.authService
      .register({
        name: this.name,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.message = 'Account created successfully';
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.message = error.error?.message || 'Error creating account';
          this.isLoading = false;
        },
      });
  }
}
