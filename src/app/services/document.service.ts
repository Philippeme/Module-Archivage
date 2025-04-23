import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap, switchMap } from 'rxjs/operators';
import { Document, DocumentType, DocumentComment, DocumentAction, ActionType, Folder } from '../models/document.model';
import { User, UserRole, UserLevel } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { DocumentSimulatorService } from './document-simulator.service';
import { FilterCriteria } from '../models/filter.model';
import { PermissionService } from '../services/permission.service';
import { PermissionType } from '../models/permission.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://api.example.com/api';

  // Pour la démonstration, nous utilisons des données statiques
  private mockDocuments: Document[] = [
    {
      id: '1',
      originalName: 'Mariage_Diallo_Keita.pdf',
      name: 'encrypted_123456.pdf',
      path: '/Archives/Acte de mariage/2023/03/15/',
      type: DocumentType.MARRIAGE_CERTIFICATE,
      creationDate: new Date(2023, 2, 15),
      lastModificationDate: new Date(2023, 2, 15),
      sourceInstitution: 'Centre d\'État Civil de Bamako',
      creator: 'Amadou Touré',
      lastModifier: 'Amadou Touré',
      version: 1,
      concernedPerson1: 'Ibrahim Diallo',
      concernedPerson2: 'Aminata Keita',
      deleted: false,
      size: 1024
    },
    {
      id: '2',
      originalName: 'Declaration_Naissance_Coulibaly.pdf',
      name: 'encrypted_789012.pdf',
      path: '/Archives/Déclaration de naissance/2023/04/10/',
      type: DocumentType.BIRTH_DECLARATION,
      creationDate: new Date(2023, 3, 10),
      lastModificationDate: new Date(2023, 3, 10),
      sourceInstitution: 'Centre de Déclaration de Ségou',
      creator: 'Fatoumata Diarra',
      lastModifier: 'Fatoumata Diarra',
      version: 1,
      concernedPerson1: 'Mamadou Coulibaly',
      deleted: false,
      size: 768
    },
    {
      id: '3',
      originalName: 'Jugement_Suppletif_Traoré.pdf',
      name: 'encrypted_345678.pdf',
      path: '/Archives/Jugement supplétif/2023/05/22/',
      type: DocumentType.SUPPLEMENTARY_JUDGMENT,
      creationDate: new Date(2023, 4, 22),
      lastModificationDate: new Date(2023, 4, 22),
      sourceInstitution: 'Tribunal de Kayes',
      creator: 'SYSTEME',
      lastModifier: 'SYSTEME',
      version: 1,
      concernedPerson1: 'Oumar Traoré',
      deleted: false,
      size: 1536
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private permissionService: PermissionService,
    private documentSimulator: DocumentSimulatorService
  ) { }

  // Méthodes d'accès aux API

  getDocuments(filterCriteria?: FilterCriteria): Observable<Document[]> {
    if (this.authService.isApiMode()) {
      let params = new HttpParams();
      
      if (filterCriteria) {
        // Convertir les critères de filtre en paramètres HTTP
        Object.entries(filterCriteria).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              // Pour les tableaux, on peut soit utiliser des paramètres répétés, soit les joindre
              value.forEach((item: string) => {
                params = params.append(`${key}[]`, item);
              });
            } else if (value instanceof Date) {
              // Convertir les dates en format ISO
              params = params.set(key, value.toISOString());
            } else {
              params = params.set(key, String(value));
            }
          }
        });
      }
      
      return this.http.get<Document[]>(`${this.apiUrl}/documents`, { params }).pipe(
        catchError(error => {
          console.error('Error fetching documents', error);
          return throwError(() => new Error('Failed to load documents. Please try again later.'));
        })
      );
    } else {
      // Mode mock amélioré pour le filtrage avancé
      let filteredDocs = [...this.mockDocuments];
      
      if (filterCriteria) {
        // Appliquer le filtre sur chaque document en fonction de l'opérateur logique
        const operator = filterCriteria.logicalOperator || 'AND';
        
        if (operator === 'AND') {
          // Opérateur AND : tous les critères doivent être satisfaits
          Object.entries(filterCriteria).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && key !== 'logicalOperator') {
              filteredDocs = this.applyFilterCriterion(filteredDocs, key, value);
            }
          });
        } else {
          // Opérateur OR : au moins un critère doit être satisfait
          const originalDocs = [...filteredDocs];
          const matchingDocs = new Set<string>();
          
          Object.entries(filterCriteria).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && key !== 'logicalOperator') {
              const docsMatchingCriterion = this.applyFilterCriterion(originalDocs, key, value);
              docsMatchingCriterion.forEach(doc => matchingDocs.add(doc.id));
            }
          });
          
          // Ne garder que les documents qui correspondent à au moins un critère
          if (matchingDocs.size > 0) {
            filteredDocs = originalDocs.filter(doc => matchingDocs.has(doc.id));
          }
        }
        
        // Filtrer les documents supprimés si demandé
        if (filterCriteria.excludeDeleted) {
          filteredDocs = filteredDocs.filter(doc => !doc.deleted);
        }
        
        // Appliquer le tri
        if (filterCriteria.sortBy) {
          const direction = filterCriteria.sortDirection === 'desc' ? -1 : 1;
          const sortKey = filterCriteria.sortBy as keyof Document;
          
          filteredDocs.sort((a, b) => {
            const valueA = a[sortKey];
            const valueB = b[sortKey];
            
            if (valueA instanceof Date && valueB instanceof Date) {
              return direction * (valueA.getTime() - valueB.getTime());
            }
            
            if (typeof valueA === 'string' && typeof valueB === 'string') {
              return direction * valueA.localeCompare(valueB);
            }
            
            if (valueA !== undefined && valueB !== undefined) {
              if (valueA < valueB) return -1 * direction;
              if (valueA > valueB) return 1 * direction;
            }
            return 0;
          });
        }
        
        // Appliquer la pagination si nécessaire
        if (filterCriteria.pageSize && filterCriteria.pageIndex !== undefined) {
          const startIndex = filterCriteria.pageIndex * filterCriteria.pageSize;
          filteredDocs = filteredDocs.slice(startIndex, startIndex + filterCriteria.pageSize);
        }
      }
      
      // Simuler un délai réseau
      return of(filteredDocs).pipe(delay(300));
    }
  }

  private applyFilterCriterion(docs: Document[], key: string, value: any): Document[] {
    switch (key) {
      case 'searchTerm':
        return docs.filter(doc => 
          doc.originalName.toLowerCase().includes(value.toLowerCase()) || 
          (doc.concernedPerson1 && doc.concernedPerson1.toLowerCase().includes(value.toLowerCase())) ||
          (doc.concernedPerson2 && doc.concernedPerson2.toLowerCase().includes(value.toLowerCase())) ||
          (doc.sourceInstitution && doc.sourceInstitution.toLowerCase().includes(value.toLowerCase()))
        );
        
      case 'documentType':
        if (Array.isArray(value)) {
          return docs.filter(doc => value.includes(doc.type));
        }
        return docs.filter(doc => doc.type === value);
        
      case 'region':
        if (Array.isArray(value)) {
          return docs.filter(doc => 
            value.some(region => doc.sourceInstitution.includes(region) || doc.path.includes(region))
          );
        }
        return docs.filter(doc => 
          doc.sourceInstitution.includes(value) || doc.path.includes(value)
        );
        
      case 'startDate':
        const startDate = value instanceof Date ? value : new Date(value);
        return docs.filter(doc => doc.creationDate >= startDate);
        
      case 'endDate':
        const endDate = value instanceof Date ? value : new Date(value);
        return docs.filter(doc => doc.creationDate <= endDate);
        
      case 'concernedPerson':
        return docs.filter(doc => 
          (doc.concernedPerson1 && doc.concernedPerson1.toLowerCase().includes(value.toLowerCase())) ||
          (doc.concernedPerson2 && doc.concernedPerson2.toLowerCase().includes(value.toLowerCase()))
        );
        
      case 'sourceInstitution':
        return docs.filter(doc => 
          doc.sourceInstitution.toLowerCase().includes(value.toLowerCase())
        );
        
      case 'creator':
        return docs.filter(doc => 
          doc.creator.toLowerCase().includes(value.toLowerCase())
        );
        
      case 'lastModifier':
        return docs.filter(doc => 
          doc.lastModifier.toLowerCase().includes(value.toLowerCase())
        );
        
      case 'path':
        return docs.filter(doc => doc.path.startsWith(value));
        
      default:
        return docs;
    }
  }

  searchDocuments(term: string, options?: {
    fullText?: boolean,
    exactMatch?: boolean,
    caseSensitive?: boolean,
    fields?: string[]
  }): Observable<Document[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Document[]>(`${this.apiUrl}/documents/search`, {
        params: {
          term,
          fullText: options?.fullText ? 'true' : 'false',
          exactMatch: options?.exactMatch ? 'true' : 'false',
          caseSensitive: options?.caseSensitive ? 'true' : 'false',
          fields: options?.fields ? options.fields.join(',') : ''
        }
      }).pipe(
        catchError(error => {
          console.error('Error searching documents', error);
          return throwError(() => new Error('Failed to search documents. Please try again later.'));
        })
      );
    } else {
      // Mode mock pour la recherche avancée
      if (!term) {
        return of([]);
      }
      
      const searchTerm = options?.caseSensitive ? term : term.toLowerCase();
      
      // Définir les champs à rechercher
      const fieldsToSearch = options?.fields || [
        'originalName', 'concernedPerson1', 'concernedPerson2', 
        'sourceInstitution', 'creator', 'lastModifier'
      ];
      
      // Copier les documents mock
      let results = [...this.mockDocuments];
      
      // Filtrer par terme de recherche
      results = results.filter(doc => {
        return fieldsToSearch.some(field => {
          const fieldValue = doc[field as keyof Document];
          
          if (typeof fieldValue !== 'string') {
            return false;
          }
          
          const value = options?.caseSensitive ? fieldValue : fieldValue.toLowerCase();
          
          if (options?.exactMatch) {
            return value === searchTerm;
          } else {
            return value.includes(searchTerm);
          }
        });
      });
      
      return of(results).pipe(delay(300));
    }
  }

  getRootFolders(): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/root`).pipe(
        catchError(error => {
          console.error('Error fetching root folders', error);
          return throwError(() => new Error('Failed to load folders. Please try again later.'));
        })
      );
    } else {
      // Pour notre démonstration, nous retournons les 3 types de documents demandés
      return of([
        { name: DocumentType.MARRIAGE_CERTIFICATE, path: '/Archives/Acte de mariage/', type: 'document-type' },
        { name: DocumentType.BIRTH_DECLARATION, path: '/Archives/Déclaration de naissance/', type: 'document-type' },
        { name: DocumentType.SUPPLEMENTARY_JUDGMENT, path: '/Archives/Jugement supplétif/', type: 'document-type' }
      ]);
    }
  }

  // Méthodes de navigation temporelle

  getYearFolders(documentType: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/years`, {
        params: new HttpParams().set('documentType', documentType)
      }).pipe(
        catchError(error => {
          console.error('Error fetching year folders', error);
          return throwError(() => new Error('Échec du chargement des dossiers par année.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par année
      const currentYear = new Date().getFullYear();
      const oldestYear = currentYear - 5; // Simulation d'un document de 5 ans

      const folders: Folder[] = [];
      for (let year = currentYear; year >= oldestYear; year--) {
        folders.push({
          name: year.toString(),
          path: `/Archives/${documentType}/${year}/`,
          type: 'year',
          lastModificationDate: new Date(year, 11, 31)
        });
      }

      return of(folders);
    }
  }

  getMonthFolders(yearPath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/months`, {
        params: new HttpParams().set('yearPath', yearPath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching month folders', error);
          return throwError(() => new Error('Échec du chargement des dossiers par mois.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par mois
      const pathParts = yearPath.split('/');
      const yearString = pathParts[pathParts.length - 2];
      // S'assurer que nous avons seulement 4 chiffres pour l'année
      const year = parseInt(yearString.substring(0, 4), 10);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];

      const folders: Folder[] = [];

      // Pour l'année en cours, afficher seulement jusqu'au mois actuel
      const monthLimit = (year === currentYear) ? currentMonth + 1 : 12;

      for (let month = 0; month < monthLimit; month++) {
        folders.push({
          name: monthNames[month],
          path: `${yearPath}${month + 1}/`,
          type: 'month',
          lastModificationDate: new Date(year, month, 28)
        });
      }

      return of(folders);
    }
  }

  getDayFolders(monthPath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/days`, {
        params: new HttpParams().set('monthPath', monthPath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching day folders', error);
          return throwError(() => new Error('Échec du chargement des dossiers par jour.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par jour
      const pathParts = monthPath.split('/');
      const yearStr = pathParts[pathParts.length - 3];
      const monthStr = pathParts[pathParts.length - 2];

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // Les mois commencent à 0 en JavaScript

      // Déterminer le nombre de jours dans le mois
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const folders: Folder[] = [];

      // Créer un dossier pour chaque jour du mois
      for (let day = 1; day <= daysInMonth; day++) {
        // Vérifier si nous avons des documents pour ce jour (simulation)
        const hasDocuments = Math.random() > 0.7; // 30% de chances d'avoir des documents

        if (hasDocuments) {
          folders.push({
            name: day.toString().padStart(2, '0'),
            path: `${monthPath}${day.toString().padStart(2, '0')}/`,
            type: 'day',
            lastModificationDate: new Date(year, month, day)
          });
        }
      }

      return of(folders);
    }
  }

  // Méthodes de navigation géographique

  getRegionFolders(documentType: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/regions`, {
        params: new HttpParams().set('documentType', documentType)
      }).pipe(
        catchError(error => {
          console.error('Error fetching region folders', error);
          return throwError(() => new Error('Échec du chargement des dossiers par région.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par région
      const regions: Folder[] = [
        {
          name: 'Kayes',
          path: `/Archives/${documentType}/Kayes/`,
          type: 'region' as 'region'
        },
        {
          name: 'Koulikoro',
          path: `/Archives/${documentType}/Koulikoro/`,
          type: 'region' as 'region'
        },
        {
          name: 'Sikasso',
          path: `/Archives/${documentType}/Sikasso/`,
          type: 'region' as 'region'
        },
        {
          name: 'Ségou',
          path: `/Archives/${documentType}/Ségou/`,
          type: 'region' as 'region'
        },
        {
          name: 'Mopti',
          path: `/Archives/${documentType}/Mopti/`,
          type: 'region' as 'region'
        },
        {
          name: 'District de Bamako',
          path: `/Archives/${documentType}/District de Bamako/`,
          type: 'region' as 'region'
        }
      ];

      return of(regions);
    }
  }

  getCircleFolders(regionPath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/circles`, {
        params: new HttpParams().set('regionPath', regionPath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching circle folders', error);
          return throwError(() => new Error('Échec du chargement des cercles.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par cercle
      const pathParts = regionPath.split('/');
      const region = pathParts[pathParts.length - 2];

      // Cas particulier pour le District de Bamako
      if (region === 'District de Bamako') {
        // Le District de Bamako n'a pas de cercles, mais directement des communes
        return this.getCommuneFolders(regionPath);
      }

      // Pour les autres régions, générer des cercles
      const circles: Folder[] = [];

      // Nombre de cercles selon la région
      let circleCount = 5;

      if (region === 'Kayes') circleCount = 7;
      else if (region === 'Koulikoro') circleCount = 7;
      else if (region === 'Sikasso') circleCount = 7;
      else if (region === 'Ségou') circleCount = 7;
      else if (region === 'Mopti') circleCount = 8;

      for (let i = 1; i <= circleCount; i++) {
        circles.push({
          name: `Cercle de ${region} ${i}`,
          path: `${regionPath}Cercle de ${region} ${i}/`,
          type: 'circle'
        });
      }

      return of(circles);
    }
  }

  getCommuneFolders(circlePath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/communes`, {
        params: new HttpParams().set('circlePath', circlePath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching commune folders', error);
          return throwError(() => new Error('Échec du chargement des communes.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par commune
      const pathParts = circlePath.split('/');
      const parentName = pathParts[pathParts.length - 2];

      const communes: Folder[] = [];

      // Cas particulier pour le District de Bamako
      if (parentName === 'District de Bamako') {
        // Les communes du District de Bamako
        for (let i = 1; i <= 6; i++) {
          communes.push({
            name: `Commune ${toRoman(i)}`,
            path: `${circlePath}Commune ${toRoman(i)}/`,
            type: 'commune'
          });
        }
      } else {
        // Pour les cercles, générer des communes
        const communeCount = 5; // Nombre arbitraire pour la simulation

        for (let i = 1; i <= communeCount; i++) {
          communes.push({
            name: `Commune de ${parentName.replace('Cercle de ', '')} ${i}`,
            path: `${circlePath}Commune de ${parentName.replace('Cercle de ', '')} ${i}/`,
            type: 'commune'
          });
        }
      }

      return of(communes);
    }
  }

  getCivilStatusCenterFolders(communePath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/centers`, {
        params: new HttpParams().set('communePath', communePath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching civil status center folders', error);
          return throwError(() => new Error('Échec du chargement des centres d\'état civil.'));
        })
      );
    } else {
      // Simuler la récupération des dossiers par centre d'état civil
      const centers: Folder[] = [];

      // Nombre arbitraire de centres pour la simulation
      const centerCount = 3;

      for (let i = 1; i <= centerCount; i++) {
        centers.push({
          name: `Centre d'État Civil ${String.fromCharCode(64 + i)}`,
          path: `${communePath}Centre d'État Civil ${String.fromCharCode(64 + i)}/`,
          type: 'center'
        });
      }

      return of(centers);
    }
  }

  // Méthodes pour les commentaires
  getDocumentComments(documentId: string): Observable<DocumentComment[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<DocumentComment[]>(`${this.apiUrl}/documents/${documentId}/comments`).pipe(
        catchError(error => {
          console.error('Error fetching document comments', error);
          return throwError(() => new Error('Failed to load document comments. Please try again later.'));
        })
      );
    } else {
      // Mode simulation pour le développement
      return of([
        {
          id: '1',
          documentId: documentId,
          userId: '1',
          userName: 'Admin Utilisateur',
          text: 'Document vérifié et approuvé.',
          creationDate: new Date(2023, 5, 15)
        },
        {
          id: '2',
          documentId: documentId,
          userId: '2',
          userName: 'Amadou Touré',
          text: 'Informations confirmées avec le centre d\'état civil.',
          creationDate: new Date(2023, 5, 16)
        }
      ]).pipe(delay(300)); // Simuler un délai réseau
    }
  }

  addDocumentComment(documentId: string, text: string): Observable<DocumentComment> {
    if (this.authService.isApiMode()) {
      return this.http.post<DocumentComment>(`${this.apiUrl}/documents/${documentId}/comments`, { text }).pipe(
        catchError(error => {
          console.error('Error adding document comment', error);
          return throwError(() => new Error('Failed to add comment. Please try again later.'));
        })
      );
    } else {
      // Mode simulation pour le développement
      const currentUser = this.authService.getCurrentUser();
      const newComment: DocumentComment = {
        id: Math.random().toString(36).substr(2, 9),
        documentId: documentId,
        userId: currentUser?.id || '1',
        userName: `${currentUser?.firstName || 'Admin'} ${currentUser?.lastName || 'Utilisateur'}`,
        text: text,
        creationDate: new Date()
      };
      return of(newComment).pipe(delay(300)); // Simuler un délai réseau
    }
  }

  // Méthodes pour l'historique des actions
  getDocumentActionHistory(documentId: string): Observable<DocumentAction[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<DocumentAction[]>(`${this.apiUrl}/documents/${documentId}/actions`).pipe(
        catchError(error => {
          console.error('Error fetching document action history', error);
          return throwError(() => new Error('Failed to load document action history. Please try again later.'));
        })
      );
    } else {
      // Mode simulation pour le développement
      return of([
        {
          id: '1',
          documentId: documentId,
          userId: '1',
          userName: 'Admin Utilisateur',
          actionType: ActionType.VIEW,
          actionDate: new Date(2023, 5, 15, 10, 30)
        },
        {
          id: '2',
          documentId: documentId,
          userId: '1',
          userName: 'Admin Utilisateur',
          actionType: ActionType.DOWNLOAD,
          actionDate: new Date(2023, 5, 15, 10, 32)
        },
        {
          id: '3',
          documentId: documentId,
          userId: '2',
          userName: 'Amadou Touré',
          actionType: ActionType.SHARE,
          actionDate: new Date(2023, 5, 16, 14, 15),
          details: 'Partagé avec direction@example.com'
        }
      ]).pipe(delay(300)); // Simuler un délai réseau
    }
  }

  recordDocumentAction(documentId: string, actionType: ActionType, details?: string): Observable<DocumentAction> {
    if (this.authService.isApiMode()) {
      return this.http.post<DocumentAction>(`${this.apiUrl}/documents/${documentId}/actions`, {
        actionType,
        details
      }).pipe(
        catchError(error => {
          console.error('Error recording document action', error);
          return throwError(() => new Error('Failed to record action. Please try again later.'));
        })
      );
    } else {
      // Mode simulation pour le développement
      const currentUser = this.authService.getCurrentUser();
      const newAction: DocumentAction = {
        id: Math.random().toString(36).substr(2, 9),
        documentId: documentId,
        userId: currentUser?.id || '1',
        userName: `${currentUser?.firstName || 'Admin'} ${currentUser?.lastName || 'Utilisateur'}`,
        actionType: actionType,
        actionDate: new Date(),
        details: details
      };
      return of(newAction).pipe(delay(100)); // Simuler un délai réseau minimal
    }
  }

  // Méthode pour obtenir une prévisualisation légère du document
  getDocumentPreview(documentId: string): Observable<Blob> {
    if (this.authService.isApiMode()) {
      return this.http.get(`${this.apiUrl}/documents/${documentId}/preview`, {
        responseType: 'blob'
      }).pipe(
        catchError(error => {
          console.error('Error getting document preview', error);
          return throwError(() => new Error('Failed to load document preview. Please try again later.'));
        })
      );
    } else {
      // Utiliser le simulateur en mode prévisualisation
      const document = this.mockDocuments.find(doc => doc.id === documentId);
      if (!document) {
        return throwError(() => new Error('Document not found'));
      }
      
      const simulatedPreview = this.documentSimulator.generateSimulatedPdf(documentId, document.type, true);
      
      // Délai plus court pour la prévisualisation
      return of(simulatedPreview).pipe(delay(350));
    }
  }

  // Méthode pour comparer deux versions d'un document
  compareDocumentVersions(documentId: string, version1: number, version2: number): Observable<Blob> {
    if (this.authService.isApiMode()) {
      return this.http.get(`${this.apiUrl}/documents/${documentId}/compare`, {
        params: new HttpParams()
          .set('version1', version1.toString())
          .set('version2', version2.toString()),
        responseType: 'blob'
      }).pipe(
        catchError(error => {
          console.error('Error comparing document versions', error);
          return throwError(() => new Error('Failed to compare document versions. Please try again later.'));
        })
      );
    } else {
      // Générer un document de comparaison simulé
      const document = this.mockDocuments.find(doc => doc.id === documentId);
      if (!document) {
        return throwError(() => new Error('Document not found'));
      }
      
      // Créer un contenu simulé spécial pour la comparaison
      const simulatedComparison = this.documentSimulator.generateSimulatedPdf(
        `${documentId}_v${version1}_vs_v${version2}`, 
        `Comparaison ${document.type}`, 
        false
      );
      
      return of(simulatedComparison).pipe(delay(800));
    }
  }

  // Méthode générique pour charger les dossiers selon le mode de navigation
  loadFolders(path: string, navigationType: 'time' | 'location'): Observable<Folder[]> {
    // Analyser le chemin pour déterminer le niveau actuel
    const pathParts = path.split('/').filter(part => part !== '');

    // Si nous sommes à la racine, retourner les types de documents
    if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'Archives')) {
      return this.getRootFolders();
    }

    // Récupérer le type de document (toujours le premier élément après "Archives")
    const documentType = pathParts[1];

    if (navigationType === 'time') {
      // Navigation par temps
      if (pathParts.length === 2) {
        // Niveau des années
        return this.getYearFolders(documentType);
      } else if (pathParts.length === 3) {
        // Niveau des mois
        return this.getMonthFolders(path);
      } else if (pathParts.length === 4) {
        // Niveau des jours
        return this.getDayFolders(path);
      }
    } else {
      // Navigation par lieu
      if (pathParts.length === 2) {
        // Niveau des régions
        return this.getRegionFolders(documentType);
      } else if (pathParts.length === 3) {
        // Niveau des cercles (ou communes pour Bamako)
        return this.getCircleFolders(path);
      } else if (pathParts.length === 4) {
        // Niveau des communes (ou centres pour Bamako)
        return this.getCommuneFolders(path);
      } else if (pathParts.length === 5) {
        // Niveau des centres d'état civil
        return this.getCivilStatusCenterFolders(path);
      }
    }

    // Si le niveau n'est pas reconnu, retourner un tableau vide
    return of([]);
  }

  getDocumentVersions(documentId: string): Observable<Document[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Document[]>(`${this.apiUrl}/documents/${documentId}/versions`).pipe(
        catchError(error => {
          console.error('Error fetching document versions', error);
          return throwError(() => new Error('Failed to load document versions. Please try again later.'));
        })
      );
    } else {
      // Simuler les versions d'un document
      const document = this.mockDocuments.find(doc => doc.id === documentId);

      if (!document) {
        return throwError(() => new Error('Document not found'));
      }

      const versions: Document[] = [
        { ...document },
        {
          ...document,
          id: `${document.id}_v1`,
          version: document.version - 1,
          lastModificationDate: new Date(document.lastModificationDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      ];

      return of(versions);
    }
  }

  downloadDocument(documentId: string): Observable<Blob> {
    // Vérifier les permissions avant de télécharger
    return this.permissionService.checkPermission(
      PermissionType.DOWNLOAD, 
      'document', 
      documentId
    ).pipe(
      switchMap(result => {
        if (!result.granted) {
          return throwError(() => new Error(result.reason || 'Permission denied'));
        }
        
        // Permission accordée, procéder au téléchargement
        if (this.authService.isApiMode()) {
          return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, {
            responseType: 'blob'
          }).pipe(
            tap(() => {
              // Enregistrer l'action de téléchargement
              this.recordDocumentAction(documentId, ActionType.DOWNLOAD).subscribe();
            }),
            catchError(error => {
              console.error('Error downloading document', error);
              return throwError(() => new Error('Failed to download document. Please try again later.'));
            })
          );
        } else {
          // Code existant du mode simulation...
          const document = this.mockDocuments.find(doc => doc.id === documentId);
          if (!document) {
            return throwError(() => new Error('Document not found'));
          }
          
          const simulatedPdf = this.documentSimulator.generateSimulatedPdf(documentId, document.type, false);
          
          // Simuler un délai réseau réaliste pour le téléchargement complet
          return of(simulatedPdf).pipe(
            delay(1200),
            tap(() => {
              // Enregistrer l'action de téléchargement
              this.recordDocumentAction(documentId, ActionType.DOWNLOAD).subscribe();
            })
          );
        }
      })
    );
  }

  shareDocumentByEmail(documentId: string, emailAddress: string, options?: {
    subject?: string,
    message?: string,
    includePreview?: boolean
  }): Observable<boolean> {
    if (this.authService.isApiMode()) {
      return this.http.post<boolean>(`${this.apiUrl}/documents/${documentId}/share`, { 
        emailAddress,
        subject: options?.subject || 'Partage de document',
        message: options?.message || 'Veuillez trouver ci-joint le document demandé.',
        includePreview: options?.includePreview !== undefined ? options.includePreview : true
      }).pipe(
        catchError(error => {
          console.error('Error sharing document', error);
          return throwError(() => new Error('Failed to share document. Please try again later.'));
        })
      );
    } else {
      // Mode simulation amélioré
      console.log(`Document ${documentId} partagé avec ${emailAddress}`);
      console.log('Options:', options);
      
      // Simuler un délai réseau plus réaliste
      return of(true).pipe(delay(800));
    }
  }

  // Fonction utilitaire pour obtenir l'icône en fonction du type de dossier
  getFolderIcon(folder: Folder): string {
    switch (folder.type) {
      case 'year':
        return 'bi-calendar-year';
      case 'month':
        return 'bi-calendar-month';
      case 'day':
        return 'bi-calendar-day';
      case 'region':
        return 'bi-geo-alt';
      case 'circle':
        return 'bi-circle';
      case 'commune':
        return 'bi-building';
      case 'center':
        return 'bi-house-door';
      default:
        return 'bi-folder';
    }
  }

  // Fonction utilitaire pour obtenir la couleur en fonction du type de dossier
  getFolderColor(folder: Folder): string {
    switch (folder.type) {
      case 'year':
        return 'text-primary';
      case 'month':
        return 'text-success';
      case 'day':
        return 'text-info';
      case 'region':
        return 'text-danger';
      case 'circle':
        return 'text-warning';
      case 'commune':
        return 'text-purple';
      case 'center':
        return 'text-teal';
      default:
        return 'text-warning';
    }
  }

  // Méthodes utilitaires

  getDocumentType(path: string): DocumentType | null {
    for (const type of Object.values(DocumentType)) {
      if (path.includes(type)) {
        return type as DocumentType;
      }
    }
    return null;
  }

  getDocumentByPath(path: string): Observable<Document | null> {
    return this.getDocuments().pipe(
      map(documents => documents.find(doc => doc.path === path) || null)
    );
  }

  canUserAccessDocument(documentId: string): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return of(false);
    }

    // En mode API, vérifier l'accès via le backend
    if (this.authService.isApiMode()) {
      return this.http.get<boolean>(`${this.apiUrl}/documents/${documentId}/access-check`).pipe(
        catchError(error => {
          console.error('Error checking document access', error);
          return of(false);
        })
      );
    } else {
      // En mode mock, vérifier en fonction du rôle et du niveau de responsabilité
      const document = this.mockDocuments.find(doc => doc.id === documentId);

      if (!document) {
        return of(false);
      }

      // Accès pour l'administrateur
      if (currentUser.role === UserRole.ADMIN) {
        return of(true);
      }

      // Accès pour les utilisateurs selon leur niveau et zone
      const documentRegion = this.extractRegionFromPath(document.path);

      if (currentUser.level === UserLevel.REGIONAL && currentUser.regions?.includes(documentRegion)) {
        return of(true);
      }

      const documentCenter = this.extractCenterFromPath(document.path);

      if (
        (currentUser.level === UserLevel.CENTER && currentUser.centers?.includes(documentCenter)) ||
        (currentUser.level === UserLevel.COURT && document.sourceInstitution.includes('Tribunal')) ||
        (currentUser.level === UserLevel.DECLARATION_CENTER && document.sourceInstitution.includes('Centre de Déclaration'))
      ) {
        return of(true);
      }

      return of(false);
    }
  }

  private extractRegionFromPath(path: string): string {
    const regions = [
      'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'District de Bamako'
    ];

    for (const region of regions) {
      if (path.includes(region)) {
        return region;
      }
    }

    return '';
  }

  private extractCenterFromPath(path: string): string {
    const match = path.match(/Centre d'État Civil [A-Z]/);
    return match ? match[0] : '';
  }
}

// Fonction utilitaire pour convertir un nombre en chiffres romains (pour les communes de Bamako)
function toRoman(num: number): string {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return roman[num - 1] || num.toString();
}