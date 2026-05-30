import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  email = '';
  message = '';
  error = '';
  loading = false;

  submit() {
    this.loading = true;
    this.message = '';
    this.error = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.message = 'If that email exists, a reset link has been sent.';
        this.loading = false;
      },
      error: () => {
        // Same message to avoid email enumeration
        this.message = 'If that email exists, a reset link has been sent.';
        this.loading = false;
      },
    });
  }
}
