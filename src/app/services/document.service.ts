import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { catchError, map, tap } from 'rxjs/operators';
import { Document, DocumentType, DocumentComment, DocumentAction, ActionType, Folder } from '../models/document.model';
import { User, UserRole, UserLevel } from '../models/user.model'; 
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

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
    private authService: AuthService
  ) { }

  // Méthodes d'accès aux API
  
  getDocuments(filters?: any): Observable<Document[]> {
    if (this.authService.isApiMode()) {
      let params = new HttpParams();
      
      if (filters) {
        if (filters.searchTerm) params = params.set('search', filters.searchTerm);
        if (filters.documentType) params = params.set('type', filters.documentType);
        if (filters.region) params = params.set('region', filters.region);
        if (filters.startDate) params = params.set('startDate', filters.startDate);
        if (filters.endDate) params = params.set('endDate', filters.endDate);
        if (filters.path) params = params.set('path', filters.path);
      }
      
      return this.http.get<Document[]>(`${this.apiUrl}/documents`, { params }).pipe(
        catchError(error => {
          console.error('Error fetching documents', error);
          return throwError(() => new Error('Failed to load documents. Please try again later.'));
        })
      );
    } else {
      // Mode mock pour développement
      let filteredDocs = [...this.mockDocuments];
      
      if (filters) {
        if (filters.searchTerm) {
          const searchTerm = filters.searchTerm.toLowerCase();
          filteredDocs = filteredDocs.filter(doc => 
            doc.originalName.toLowerCase().includes(searchTerm) || 
            doc.concernedPerson1.toLowerCase().includes(searchTerm) ||
            (doc.concernedPerson2 && doc.concernedPerson2.toLowerCase().includes(searchTerm))
          );
        }
        
        if (filters.documentType) {
          filteredDocs = filteredDocs.filter(doc => doc.type === filters.documentType);
        }
        
        if (filters.region) {
          // Simulation de filtrage par région (dans une vraie implémentation, vérifier le path)
          filteredDocs = filteredDocs.filter(doc => 
            doc.sourceInstitution.includes(filters.region)
          );
        }
        
        if (filters.path) {
          filteredDocs = filteredDocs.filter(doc => 
            doc.path.startsWith(filters.path)
          );
        }
      }
      
      return of(filteredDocs);
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
    if (this.authService.isApiMode()) {
      return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, {
        responseType: 'blob'
      }).pipe(
        catchError(error => {
          console.error('Error downloading document', error);
          return throwError(() => new Error('Failed to download document. Please try again later.'));
        })
      );
    } else {
      // Simuler le téléchargement d'un document (pour la démonstration)
      const dummyPdfContent = new Blob(['Contenu PDF simulé'], { type: 'application/pdf' });
      return of(dummyPdfContent);
    }
  }

  shareDocumentByEmail(documentId: string, emailAddress: string): Observable<boolean> {
    if (this.authService.isApiMode()) {
      return this.http.post<boolean>(`${this.apiUrl}/documents/${documentId}/share`, { 
        emailAddress,
        subject: 'Partage de document',
        message: 'Veuillez trouver ci-joint le document demandé.'
      }).pipe(
        catchError(error => {
          console.error('Error sharing document', error);
          return throwError(() => new Error('Failed to share document. Please try again later.'));
        })
      );
    } else {
      // Mode simulation amélioré
      console.log(`Document ${documentId} partagé avec ${emailAddress}`);
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