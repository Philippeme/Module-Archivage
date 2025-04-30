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

  // Dans la fonction saveFilter, assurons-nous que l'opérateur logique est correctement sauvegardé

  saveFilter(filter: Filter, name: string, description?: string): Observable<SavedFilter> {
    const userId = this.authService.getCurrentUser()?.id;

    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    // S'assurer que logicalOperator est préservé, même s'il s'agit de la valeur par défaut
    const logicalOperator = filter.criteria.logicalOperator || 'AND';

    const savedFilter: SavedFilter = {
      ...filter,
      id: filter.id || Math.random().toString(36).substring(2, 9),
      name: name,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSaved: true,
      description: description,
      criteria: {
        ...filter.criteria,
        logicalOperator: logicalOperator
      }
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
    // Modifié pour traiter les termes dès le premier caractère
    if (!term || term.length < 1) {
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
      const termLower = term.toLowerCase();

      // Suggestions de documents basées sur le type
      if ('acte'.includes(termLower) || termLower.includes('acte') || termLower.includes('act')) {
        suggestions.push({
          type: 'document',
          value: 'Acte de mariage',
          count: 236,
          displayValue: 'Type: Acte de mariage (236 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Acte de naissance',
          count: 427,
          displayValue: 'Type: Acte de naissance (427 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Acte de décès',
          count: 148,
          displayValue: 'Type: Acte de décès (148 documents)'
        });
      }

      if ('mariage'.includes(termLower) || termLower.includes('maria') || termLower.includes('mari')) {
        suggestions.push({
          type: 'document',
          value: 'Acte de mariage',
          count: 236,
          displayValue: 'Type: Acte de mariage (236 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Publication de mariage',
          count: 112,
          displayValue: 'Type: Publication de mariage (112 documents)'
        });
      }

      if ('déclaration'.includes(termLower) || termLower.includes('decla') || termLower.includes('décla')) {
        suggestions.push({
          type: 'document',
          value: 'Déclaration de naissance',
          count: 427,
          displayValue: 'Type: Déclaration de naissance (427 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Déclaration de décès',
          count: 156,
          displayValue: 'Type: Déclaration de décès (156 documents)'
        });
      }

      if ('naissance'.includes(termLower) || termLower.includes('naiss') || termLower.includes('birth')) {
        suggestions.push({
          type: 'document',
          value: 'Acte de naissance',
          count: 427,
          displayValue: 'Type: Acte de naissance (427 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Déclaration de naissance',
          count: 427,
          displayValue: 'Type: Déclaration de naissance (427 documents)'
        });
      }

      if ('décès'.includes(termLower) || termLower.includes('deces') || termLower.includes('death')) {
        suggestions.push({
          type: 'document',
          value: 'Acte de décès',
          count: 148,
          displayValue: 'Type: Acte de décès (148 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Certificat de décès',
          count: 162,
          displayValue: 'Type: Certificat de décès (162 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Déclaration de décès',
          count: 156,
          displayValue: 'Type: Déclaration de décès (156 documents)'
        });
      }

      if ('jugement'.includes(termLower) || termLower.includes('juge') || termLower.includes('judgment')) {
        suggestions.push({
          type: 'document',
          value: 'Jugement supplétif',
          count: 89,
          displayValue: 'Type: Jugement supplétif (89 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Jugement rectificatif',
          count: 56,
          displayValue: 'Type: Jugement rectificatif (56 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Jugement d\'annulation',
          count: 34,
          displayValue: 'Type: Jugement d\'annulation (34 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Jugement d\'homologation',
          count: 45,
          displayValue: 'Type: Jugement d\'homologation (45 documents)'
        });

        suggestions.push({
          type: 'document',
          value: 'Jugement déclaratif',
          count: 23,
          displayValue: 'Type: Jugement déclaratif (23 documents)'
        });
      }

      // Suggestions de personnes
      if ('diallo'.includes(termLower) || termLower.includes('diallo')) {
        suggestions.push({
          type: 'person',
          value: 'Diallo Ibrahim',
          displayValue: 'Personne: Diallo Ibrahim'
        });

        suggestions.push({
          type: 'person',
          value: 'Diallo Aminata',
          displayValue: 'Personne: Diallo Aminata'
        });

        suggestions.push({
          type: 'person',
          value: 'Diallo Mamadou',
          displayValue: 'Personne: Diallo Mamadou'
        });
      }

      if ('keita'.includes(termLower) || termLower.includes('keita')) {
        suggestions.push({
          type: 'person',
          value: 'Keita Aminata',
          displayValue: 'Personne: Keita Aminata'
        });

        suggestions.push({
          type: 'person',
          value: 'Keita Moussa',
          displayValue: 'Personne: Keita Moussa'
        });

        suggestions.push({
          type: 'person',
          value: 'Keita Fatoumata',
          displayValue: 'Personne: Keita Fatoumata'
        });
      }

      // Suggestions de lieux
      if ('bamako'.includes(termLower) || termLower.includes('bamako')) {
        suggestions.push({
          type: 'location',
          value: 'District de Bamako',
          displayValue: 'Lieu: District de Bamako'
        });
      }

      if ('kayes'.includes(termLower) || termLower.includes('kayes')) {
        suggestions.push({
          type: 'location',
          value: 'Kayes',
          displayValue: 'Lieu: Kayes'
        });
      }

      if ('sikasso'.includes(termLower) || termLower.includes('sikasso')) {
        suggestions.push({
          type: 'location',
          value: 'Sikasso',
          displayValue: 'Lieu: Sikasso'
        });
      }

      if ('segou'.includes(termLower) || termLower.includes('ségou')) {
        suggestions.push({
          type: 'location',
          value: 'Ségou',
          displayValue: 'Lieu: Ségou'
        });
      }

      if ('mopti'.includes(termLower) || termLower.includes('mopti')) {
        suggestions.push({
          type: 'location',
          value: 'Mopti',
          displayValue: 'Lieu: Mopti'
        });
      }

      // Suggestions d'institutions
      if ('tribunal'.includes(termLower) || termLower.includes('tribunal') || termLower.includes('tribu')) {
        suggestions.push({
          type: 'institution',
          value: 'Tribunal de Kayes',
          displayValue: 'Institution: Tribunal de Kayes'
        });

        suggestions.push({
          type: 'institution',
          value: 'Tribunal de Bamako',
          displayValue: 'Institution: Tribunal de Bamako'
        });

        suggestions.push({
          type: 'institution',
          value: 'Tribunal de Sikasso',
          displayValue: 'Institution: Tribunal de Sikasso'
        });
      }

      if ('centre'.includes(termLower) || termLower.includes('centre') || termLower.includes('etat civil') || termLower.includes('état civil')) {
        suggestions.push({
          type: 'institution',
          value: 'Centre d\'État Civil de Bamako',
          displayValue: 'Institution: Centre d\'État Civil de Bamako'
        });

        suggestions.push({
          type: 'institution',
          value: 'Centre d\'État Civil de Kayes',
          displayValue: 'Institution: Centre d\'État Civil de Kayes'
        });

        suggestions.push({
          type: 'institution',
          value: 'Centre d\'État Civil de Sikasso',
          displayValue: 'Institution: Centre d\'État Civil de Sikasso'
        });
      }

      if ('declaration'.includes(termLower) || termLower.includes('déclaration')) {
        suggestions.push({
          type: 'institution',
          value: 'Centre de Déclaration de Bamako',
          displayValue: 'Institution: Centre de Déclaration de Bamako'
        });

        suggestions.push({
          type: 'institution',
          value: 'Centre de Déclaration de Kayes',
          displayValue: 'Institution: Centre de Déclaration de Kayes'
        });

        suggestions.push({
          type: 'institution',
          value: 'Centre de Déclaration de Sikasso',
          displayValue: 'Institution: Centre de Déclaration de Sikasso'
        });
      }

      // Limiter le nombre de suggestions pour éviter de surcharger l'interface
      const limitedSuggestions = suggestions.slice(0, 10);

      // Simuler un délai réseau pour l'auto-complétion
      return of(limitedSuggestions).pipe(delay(300));
    }
  }
}