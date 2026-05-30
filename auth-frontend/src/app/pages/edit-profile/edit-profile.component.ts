import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css',
})
export class EditProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  successMessage = '';
  errorMessage = '';
  errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (response: any) => {
        this.name = response.user.name;
        this.email = response.user.email;
      },
      error: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  private validate(): boolean {
    this.errors = {};

    if (!this.name.trim()) this.errors.name = 'Name is required';

    if (!this.email.trim()) this.errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))
      this.errors.email = 'Invalid email format';

    if (this.password) {
      if (this.password.length < 8) {
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
    }

    if (this.password && !this.errors.password) {
      if (!this.confirmPassword) {
        this.errors.confirmPassword = 'Please confirm your new password';
      } else if (this.confirmPassword !== this.password) {
        this.errors.confirmPassword = 'Passwords do not match';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.validate()) return;
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload: { name: string; email: string; password?: string } = {
      name: this.name,
      email: this.email,
    };

    if (this.password) {
      payload.password = this.password;
    }

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.successMessage = 'Profile updated successfully!';
        this.password = '';
        this.confirmPassword = '';
        setTimeout(() => this.router.navigate(['/profile']), 1200);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error updating profile';
        this.isLoading = false;
      },
    });
  }
}
