import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://api.example.com/api';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur s\'est produite';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        // Rediriger vers la page de connexion ou déclencher une déconnexion
      } else if (error.status === 403) {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour cette action.';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée.';
      } else if (error.status === 500) {
        errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
      } else {
        errorMessage = `${error.status}: ${error.message}`;
      }
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  get<T>(path: string, params: any = {}): Observable<T> {
    const options = {
      headers: this.getHeaders(),
      params: params
    };
    
    return this.http.get<T>(`${this.apiUrl}/${path}`, options)
      .pipe(catchError(error => this.handleError(error)));
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${path}`, body, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleError(error)));
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${path}`, body, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleError(error)));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${path}`, {
      headers: this.getHeaders()
    }).pipe(catchError(error => this.handleError(error)));
  }

  upload<T>(path: string, file: File, metadata?: any): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    // Pour les téléchargements, n'incluez pas l'en-tête Content-Type, laissez le navigateur le définir
    const headers = new HttpHeaders({
      'Authorization': this.getHeaders().get('Authorization') || ''
    });
    
    return this.http.post<T>(`${this.apiUrl}/${path}`, formData, {
      headers: headers
    }).pipe(catchError(error => this.handleError(error)));
  }

  download(path: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${path}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(catchError(error => this.handleError(error)));
  }
}