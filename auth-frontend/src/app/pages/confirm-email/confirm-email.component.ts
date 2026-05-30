import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './confirm-email.component.html',
  styleUrl: './confirm-email.component.css',
})
export class ConfirmEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  message = '';
  error = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.error = 'Invalid confirmation link.';
      return;
    }

    this.authService.confirmEmail(token).subscribe({
      next: () => {
        this.message = 'Email confirmed! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid or expired link.';
      },
    });
  }
}
