import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Vérifier si l'utilisateur est connecté
    if (this.authService.isLoggedIn()) {
      return true;
    }
    
    // Rediriger vers la page de connexion avec l'URL demandée en paramètre
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}