import { Component, inject, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_verified: number;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = environment.apiUrl;

  users: User[] = [];
  meta: Meta = { total: 0, page: 1, limit: 10, totalPages: 0 };
  message = '';
  error = '';

  // Controls
  search = '';
  sort = 'id';
  order: 'asc' | 'desc' = 'asc';
  page = 1;

  private searchTimer: any = null;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    let params = new HttpParams()
      .set('page', this.page)
      .set('limit', this.meta.limit)
      .set('sort', this.sort)
      .set('order', this.order);

    if (this.search) params = params.set('search', this.search);

    this.http
      .get<{
        users: User[];
        meta: Meta;
      }>(`${this.apiUrl}/admin/users`, { params })
      .subscribe({
        next: (res) => {
          this.users = res.users;
          this.meta = res.meta;
        },
        error: () => (this.error = 'Failed to load users.'),
      });
  }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      this.loadUsers();
    }, 300);
  }

  setSort(field: string) {
    if (this.sort === field) {
      this.order = this.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = field;
      this.order = 'asc';
    }
    this.page = 1;
    this.loadUsers();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.meta.totalPages) return;
    this.page = p;
    this.loadUsers();
  }

  changeRole(user: User, role: string) {
    this.http
      .put(`${this.apiUrl}/admin/users/${user.id}/role`, { role })
      .subscribe({
        next: () => {
          user.role = role;
          this.message = `Role of ${user.name} updated to "${role}".`;
        },
        error: (err) =>
          (this.error = err.error?.message || 'Failed to update role.'),
      });
  }

  deleteUser(user: User) {
    if (!confirm(`Delete user ${user.name}?`)) return;

    this.http.delete(`${this.apiUrl}/admin/users/${user.id}`).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== user.id);
        this.meta.total--;
        this.message = `User ${user.name} deleted.`;
      },
      error: (err) =>
        (this.error = err.error?.message || 'Failed to delete user.'),
    });
  }

  sortIcon(field: string): string {
    if (this.sort !== field) return 'bi-arrow-down-up text-muted';
    return this.order === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  currentUserId() {
    const token = this.authService.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch {
      return null;
    }
  }
}
