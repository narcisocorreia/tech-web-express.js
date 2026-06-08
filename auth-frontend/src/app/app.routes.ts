import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { AdminComponent } from './pages/admin/admin.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  {
    path: 'edit-profile',
    component: EditProfileComponent,
    canActivate: [authGuard],
  },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
];
