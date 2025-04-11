import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User, UserLevel, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://api.example.com/api';
  private apiMode = false; // mettre à true pour activer le mode API
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Utilisateur mock pour le développement
  private mockUser: User = {
    id: '1',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'Utilisateur',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    level: UserLevel.NATIONAL,
    regions: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'District de Bamako'],
    active: true,
    lastLogin: new Date()
  };

  constructor(private http: HttpClient) {
    // Vérifier si un utilisateur est déjà connecté
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  isApiMode(): boolean {
    return this.apiMode;
  }

  login(username: string, password: string): Observable<User> {
    if (this.apiMode) {
      return this.http.post<{ token: string, user: User }>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
        map(response => {
          // Stocker le token d'authentification
          localStorage.setItem('authToken', response.token);
          // Stocker l'utilisateur connecté
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          return response.user;
        }),
        catchError(error => {
          console.error('Login error', error);
          return throwError(() => new Error('Échec de la connexion. Vérifiez vos identifiants.'));
        })
      );
    } else {
      // Mode mock pour le développement
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('currentUser', JSON.stringify(this.mockUser));
        this.currentUserSubject.next(this.mockUser);
        return of(this.mockUser);
      } else {
        return throwError(() => new Error('Identifiants incorrects'));
      }
    }
  }

  logout(): void {
    if (this.apiMode) {
      // Appel au backend pour invalider le token (optionnel)
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe(
        () => {
          this.clearUserData();
        },
        error => {
          console.error('Logout error', error);
          this.clearUserData();
        }
      );
    } else {
      this.clearUserData();
    }
  }

  private clearUserData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Vérification des permissions

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Les administrateurs ont accès à tout
    if (user.role === UserRole.ADMIN) return true;
    
    return user.role === role;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Logique de vérification des permissions ici
    // Pour la démonstration, nous vérifions simplement le rôle
    switch (permission) {
      case 'VIEW_DOCUMENTS':
        return true; // Tous les utilisateurs connectés peuvent voir les documents
      case 'DOWNLOAD_DOCUMENTS':
        return user.role !== UserRole.VIEWER; // Tout le monde sauf les lecteurs
      case 'SHARE_DOCUMENTS':
        return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
      default:
        return false;
    }
  }

  // Services pour gérer les utilisateurs (admin seulement)

  getUsers(): Observable<User[]> {
    if (!this.hasRole(UserRole.ADMIN)) {
      return throwError(() => new Error('Accès non autorisé'));
    }
    
    if (this.apiMode) {
      return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
        catchError(error => {
          console.error('Error fetching users', error);
          return throwError(() => new Error('Erreur lors de la récupération des utilisateurs'));
        })
      );
    } else {
      // Simuler une liste d'utilisateurs pour la démonstration
      return of([
        this.mockUser,
        {
          id: '2',
          username: 'manager',
          firstName: 'Manager',
          lastName: 'Régional',
          email: 'manager@example.com',
          role: UserRole.MANAGER,
          level: UserLevel.REGIONAL,
          regions: ['Kayes', 'Koulikoro'],
          active: true
        },
        {
          id: '3',
          username: 'user1',
          firstName: 'Agent',
          lastName: 'Centre',
          email: 'agent@example.com',
          role: UserRole.USER,
          level: UserLevel.CENTER,
          centers: ['Centre d\'État Civil A'],
          active: true
        }
      ]);
    }
  }

  createUser(user: Omit<User, 'id'>): Observable<User> {
    if (!this.hasRole(UserRole.ADMIN)) {
      return throwError(() => new Error('Accès non autorisé'));
    }
    
    if (this.apiMode) {
      return this.http.post<User>(`${this.apiUrl}/users`, user).pipe(
        catchError(error => {
          console.error('Error creating user', error);
          return throwError(() => new Error('Erreur lors de la création de l\'utilisateur'));
        })
      );
    } else {
      // Simuler la création d'un utilisateur
      const newUser: User = {
        ...user as any,
        id: Math.random().toString(36).substr(2, 9),
        active: true
      };
      
      return of(newUser);
    }
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    if (!this.hasRole(UserRole.ADMIN)) {
      return throwError(() => new Error('Accès non autorisé'));
    }
    
    if (this.apiMode) {
      return this.http.put<User>(`${this.apiUrl}/users/${id}`, updates).pipe(
        catchError(error => {
          console.error('Error updating user', error);
          return throwError(() => new Error('Erreur lors de la mise à jour de l\'utilisateur'));
        })
      );
    } else {
      // Simuler la mise à jour d'un utilisateur
      if (id === '1') {
        const updatedUser = {
          ...this.mockUser,
          ...updates
        };
        
        return of(updatedUser);
      }
      
      return throwError(() => new Error('Utilisateur non trouvé'));
    }
  }

  deleteUser(id: string): Observable<boolean> {
    if (!this.hasRole(UserRole.ADMIN)) {
      return throwError(() => new Error('Accès non autorisé'));
    }
    
    if (this.apiMode) {
      return this.http.delete<boolean>(`${this.apiUrl}/users/${id}`).pipe(
        catchError(error => {
          console.error('Error deleting user', error);
          return throwError(() => new Error('Erreur lors de la suppression de l\'utilisateur'));
        })
      );
    } else {
      // Simuler la suppression d'un utilisateur
      return of(true);
    }
  }
}