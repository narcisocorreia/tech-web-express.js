import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  meta = { total: 0, page: 1, limit: 10, totalPages: 0 };
  search = '';
  searchSubject = new Subject<string>();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.meta.page = 1;
        this.loadUsers();
      });
  }

  loadUsers(): void {
    this.authService
      .getAdminUsers({
        page: this.meta.page,
        limit: this.meta.limit,
        search: this.search,
      })
      .subscribe((res: any) => {
        this.users = res.data;
        this.meta = res.meta;
      });
  }

  changeRole(userId: number, role: string): void {
    this.authService
      .changeUserRole(userId, role)
      .subscribe(() => this.loadUsers());
  }

  deleteUser(userId: number): void {
    if (!confirm('Apagar este utilizador?')) return;
    this.authService.adminDeleteUser(userId).subscribe(() => this.loadUsers());
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.meta.totalPages) return;
    this.meta.page = p;
    this.loadUsers();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.search);
  }
}
