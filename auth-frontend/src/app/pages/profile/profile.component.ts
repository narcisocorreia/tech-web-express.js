import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user: any = null;

  message = '';
  confirmingDelete = false;

  // Avatar upload
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploading = false;

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getProfile().subscribe({
      next: (response: any) => {
        this.user = response.user;
      },
      error: () => {
        this.message = 'Session expired. Please login again.';
        this.authService.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  uploadAvatar() {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.authService.uploadAvatar(this.selectedFile).subscribe({
      next: (res: any) => {
        this.user.avatarUrl = res.avatarUrl;
        this.selectedFile = null;
        this.previewUrl = null;
        this.uploading = false;
        this.message = 'Avatar updated!';
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to upload avatar.';
        this.uploading = false;
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  deleteAccount() {
    this.authService.deleteProfile().subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.message = 'Error deleting account. Please try again.';
        this.confirmingDelete = false;
      },
    });
  }
}
