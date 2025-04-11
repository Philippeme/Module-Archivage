import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Vérifier si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    // Vérifier les rôles requis (si définis)
    const requiredRoles = route.data['roles'] as Array<UserRole>;
    if (requiredRoles) {
      const hasRequiredRole = requiredRoles.some(role => this.authService.hasRole(role));
      if (!hasRequiredRole) {
        // Rediriger vers une page d'accès refusé ou la page d'accueil
        this.router.navigate(['/access-denied']);
        return false;
      }
    }
    
    // Vérifier les permissions requises (si définies)
    const requiredPermissions = route.data['permissions'] as Array<string>;
    if (requiredPermissions) {
      const hasRequiredPermission = requiredPermissions.every(permission => 
        this.authService.hasPermission(permission)
      );
      
      if (!hasRequiredPermission) {
        // Rediriger vers une page d'accès refusé ou la page d'accueil
        this.router.navigate(['/access-denied']);
        return false;
      }
    }
    
    return true;
  }
}