import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArchiveComponent } from './components/archive/archive.component';
import { LoginComponent } from './components/login/login.component';
import { AccessDeniedComponent } from './components/access-denied/access-denied.component';
import { UserAdminComponent } from './components/user-admin/user-admin.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { UserRole } from './models/user.model';

const routes: Routes = [
  { path: '', redirectTo: '/archives', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'access-denied', component: AccessDeniedComponent },
  { 
    path: 'archives', 
    component: ArchiveComponent,
    canActivate: [AuthGuard],
    data: { 
      permissions: ['VIEW_DOCUMENTS']
    }
  },
  {
    path: 'admin/users',
    component: UserAdminComponent,
    canActivate: [RoleGuard],
    data: { 
      roles: [UserRole.ADMIN]
    }
  },
  { path: '**', redirectTo: '/archives' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }