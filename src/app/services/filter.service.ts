import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { Filter, FilterCriteria, SavedFilter, SearchSuggestion } from '../models/filter.model';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private apiUrl = 'http://api.example.com/api';
  private mockMode = true; // À synchroniser avec le mode API/mock général
  
  private currentFilterSubject = new BehaviorSubject<Filter | null>(null);
  public currentFilter$ = this.currentFilterSubject.asObservable();
  
  // Filtres prédéfinis en mode démonstration
  private mockSavedFilters: SavedFilter[] = [
    {
      id: '1',
      name: 'Documents récents (30 jours)',
      ownerId: '1',
      createdAt: new Date(2023, 3, 10),
      criteria: {
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
        excludeDeleted: true,
        sortBy: 'creationDate',
        sortDirection: 'desc',
        logicalOperator: 'AND'
      },
      isDefault: true,
      isSaved: true
    },
    {
      id: '2',
      name: 'Actes de mariage à Bamako',
      ownerId: '1',
      createdAt: new Date(2023, 2, 15),
      criteria: {
        documentType: 'Acte de mariage',
        region: 'District de Bamako',
        excludeDeleted: true,
        sortBy: 'creationDate',
        sortDirection: 'desc',
        logicalOperator: 'AND'
      },
      isSaved: true
    },
    {
      id: '3',
      name: 'Documents du Tribunal de Kayes',
      ownerId: '1',
      createdAt: new Date(2023, 4, 5),
      criteria: {
        tribunal: 'Tribunal de Kayes',
        excludeDeleted: true,
        logicalOperator: 'AND'
      },
      isSaved: true
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Charger le filtre par défaut au démarrage
    this.loadDefaultFilter();
  }

  loadDefaultFilter(): void {
    // Charger le filtre par défaut depuis le localStorage ou utiliser un filtre vide
    const storedFilter = localStorage.getItem('defaultFilter');
    
    if (storedFilter) {
      try {
        const filter = JSON.parse(storedFilter) as Filter;
        this.currentFilterSubject.next(filter);
      } catch (error) {
        console.error('Erreur lors du chargement du filtre par défaut', error);
        this.resetFilter();
      }
    } else {
      // Utiliser le premier filtre par défaut des mocks ou créer un filtre vide
      const defaultFilter = this.mockSavedFilters.find(f => f.isDefault) || {
        criteria: {
          excludeDeleted: true,
          sortBy: 'creationDate',
          sortDirection: 'desc',
          logicalOperator: 'AND'
        }
      };
      
      this.currentFilterSubject.next(defaultFilter);
    }
  }

  resetFilter(): void {
    this.currentFilterSubject.next({
      criteria: {
        excludeDeleted: true,
        logicalOperator: 'AND'
      }
    });
  }

  updateFilter(criteria: FilterCriteria): void {
    const currentFilter = this.currentFilterSubject.value || { criteria: {} };
    const updatedFilter = {
      ...currentFilter,
      criteria: {
        ...currentFilter.criteria,
        ...criteria
      },
      isSaved: false, // Marquer comme non sauvegardé après modification
      lastUsed: new Date()
    };
    
    this.currentFilterSubject.next(updatedFilter);
    
    // Sauvegarder dans le localStorage comme filtre de session
    localStorage.setItem('sessionFilter', JSON.stringify(updatedFilter));
  }

  getSavedFilters(): Observable<SavedFilter[]> {
    if (!this.mockMode) {
      return this.http.get<SavedFilter[]>(`${this.apiUrl}/filters`).pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération des filtres sauvegardés', error);
          return throwError(() => new Error('Échec du chargement des filtres sauvegardés'));
        })
      );
    } else {
      return of(this.mockSavedFilters).pipe(delay(300));
    }
  }

  saveFilter(filter: Filter, name: string, description?: string): Observable<SavedFilter> {
    const userId = this.authService.getCurrentUser()?.id;
    
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    const savedFilter: SavedFilter = {
      ...filter,
      id: filter.id || Math.random().toString(36).substring(2, 9),
      name: name,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSaved: true,
      description: description
    };
    
    if (!this.mockMode) {
      return this.http.post<SavedFilter>(`${this.apiUrl}/filters`, savedFilter).pipe(
        catchError(error => {
          console.error('Erreur lors de la sauvegarde du filtre', error);
          return throwError(() => new Error('Échec de la sauvegarde du filtre'));
        })
      );
    } else {
      // Mode simulation : ajouter aux filtres simulés
      const existingIndex = this.mockSavedFilters.findIndex(f => f.id === savedFilter.id);
      
      if (existingIndex >= 0) {
        this.mockSavedFilters[existingIndex] = savedFilter;
      } else {
        this.mockSavedFilters.push(savedFilter);
      }
      
      // Mettre à jour le filtre courant
      this.currentFilterSubject.next(savedFilter);
      
      return of(savedFilter).pipe(delay(300));
    }
  }

  deleteFilter(filterId: string): Observable<boolean> {
    if (!this.mockMode) {
      return this.http.delete<boolean>(`${this.apiUrl}/filters/${filterId}`).pipe(
        catchError(error => {
          console.error('Erreur lors de la suppression du filtre', error);
          return throwError(() => new Error('Échec de la suppression du filtre'));
        })
      );
    } else {
      // Mode simulation
      const index = this.mockSavedFilters.findIndex(f => f.id === filterId);
      
      if (index >= 0) {
        this.mockSavedFilters.splice(index, 1);
        
        // Si le filtre courant était celui supprimé, réinitialiser
        if (this.currentFilterSubject.value?.id === filterId) {
          this.resetFilter();
        }
        
        return of(true).pipe(delay(300));
      } else {
        return throwError(() => new Error('Filtre non trouvé'));
      }
    }
  }

  setDefaultFilter(filterId: string): Observable<boolean> {
    if (!this.mockMode) {
      return this.http.put<boolean>(`${this.apiUrl}/filters/${filterId}/default`, {}).pipe(
        catchError(error => {
          console.error('Erreur lors de la définition du filtre par défaut', error);
          return throwError(() => new Error('Échec de la définition du filtre par défaut'));
        })
      );
    } else {
      // Mode simulation
      this.mockSavedFilters.forEach(f => f.isDefault = f.id === filterId);
      
      const defaultFilter = this.mockSavedFilters.find(f => f.id === filterId);
      
      if (defaultFilter) {
        localStorage.setItem('defaultFilter', JSON.stringify(defaultFilter));
        return of(true).pipe(delay(300));
      } else {
        return throwError(() => new Error('Filtre non trouvé'));
      }
    }
  }

  loadFilter(filterId: string): Observable<Filter> {
    if (!this.mockMode) {
      return this.http.get<Filter>(`${this.apiUrl}/filters/${filterId}`).pipe(
        tap(filter => this.currentFilterSubject.next(filter)),
        catchError(error => {
          console.error('Erreur lors du chargement du filtre', error);
          return throwError(() => new Error('Échec du chargement du filtre'));
        })
      );
    } else {
      // Mode simulation
      const filter = this.mockSavedFilters.find(f => f.id === filterId);
      
      if (filter) {
        this.currentFilterSubject.next(filter);
        return of(filter).pipe(delay(300));
      } else {
        return throwError(() => new Error('Filtre non trouvé'));
      }
    }
  }

  getSearchSuggestions(term: string): Observable<SearchSuggestion[]> {
    if (!term || term.length < 2) {
      return of([]);
    }
    
    if (!this.mockMode) {
      return this.http.get<SearchSuggestion[]>(`${this.apiUrl}/search/suggestions`, {
        params: { term }
      }).pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération des suggestions', error);
          return of([]);
        })
      );
    } else {
      // Suggestions simulées basées sur le terme de recherche
      const suggestions: SearchSuggestion[] = [];
      
      // Suggestions de documents
      if ('acte'.includes(term.toLowerCase()) || 'mariage'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'document',
          value: 'Acte de mariage',
          count: 236,
          displayValue: 'Type: Acte de mariage (236 documents)'
        });
      }
      
      if ('déclaration'.includes(term.toLowerCase()) || 'naissance'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'document',
          value: 'Déclaration de naissance',
          count: 427,
          displayValue: 'Type: Déclaration de naissance (427 documents)'
        });
      }
      
      // Suggestions de personnes
      if ('diallo'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'person',
          value: 'Diallo Ibrahim',
          displayValue: 'Personne: Diallo Ibrahim'
        });
      }
      
      if ('keita'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'person',
          value: 'Keita Aminata',
          displayValue: 'Personne: Keita Aminata'
        });
      }
      
      // Suggestions de lieux
      if ('bamako'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'location',
          value: 'District de Bamako',
          displayValue: 'Lieu: District de Bamako'
        });
      }
      
      if ('kayes'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'location',
          value: 'Kayes',
          displayValue: 'Lieu: Kayes'
        });
      }
      
      // Suggestions d'institutions
      if ('tribunal'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'institution',
          value: 'Tribunal de Kayes',
          displayValue: 'Institution: Tribunal de Kayes'
        });
      }
      
      if ('centre'.includes(term.toLowerCase()) || 'civil'.includes(term.toLowerCase())) {
        suggestions.push({
          type: 'institution',
          value: 'Centre d\'État Civil de Bamako',
          displayValue: 'Institution: Centre d\'État Civil de Bamako'
        });
      }
      
      // Simuler un délai réseau pour l'auto-complétion
      return of(suggestions).pipe(delay(300));
    }
  }
}