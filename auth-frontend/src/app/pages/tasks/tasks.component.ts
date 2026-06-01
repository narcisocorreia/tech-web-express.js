import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
})
export class TasksComponent implements OnInit {
  tasks: any[] = [];
  meta = { total: 0, page: 1, limit: 10, totalPages: 0 };

  search = '';
  statusFilter = '';
  sort = 'created_at';
  order = 'DESC';

  searchSubject = new Subject<string>();

  showForm = false;
  newTask = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadTasks();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.meta.page = 1;
        this.loadTasks();
      });
  }

  loadTasks(): void {
    this.authService
      .getTasks({
        page: this.meta.page,
        limit: this.meta.limit,
        search: this.search,
        status: this.statusFilter,
        sort: this.sort,
        order: this.order,
      })
      .subscribe((res: any) => {
        this.tasks = res.data;
        this.meta = res.meta;
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.search);
  }

  sortBy(column: string): void {
    if (this.sort === column) {
      this.order = this.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sort = column;
      this.order = 'ASC';
    }
    this.loadTasks();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.meta.totalPages) return;
    this.meta.page = p;
    this.loadTasks();
  }

  createTask(): void {
    this.authService.createTask(this.newTask).subscribe(() => {
      this.showForm = false;
      this.newTask = {
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
      };
      this.loadTasks();
    });
  }

  deleteTask(id: number): void {
    if (!confirm('Apagar esta tarefa?')) return;
    this.authService.deleteTask(id).subscribe(() => this.loadTasks());
  }

  getStatusBadge(status: string): string {
    const map: any = {
      pending: 'secondary',
      in_progress: 'warning',
      done: 'success',
    };
    return map[status] || 'secondary';
  }

  getPriorityBadge(p: string): string {
    const map: any = { low: 'info', medium: 'primary', high: 'danger' };
    return map[p] || 'secondary';
  }

  get pages(): number[] {
    return Array.from({ length: this.meta.totalPages }, (_, i) => i + 1);
  }
}
