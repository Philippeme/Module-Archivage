import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap, tap } from 'rxjs/operators';
import { Document, DocumentType, DocumentComment, DocumentAction, ActionType, Folder } from '../models/document.model';
import { User, UserRole, UserLevel } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { DocumentSimulatorService } from './document-simulator.service';
import { FilterCriteria } from '../models/filter.model';
import { PermissionService } from './permission.service';
import { PermissionType } from '../models/permission.model';
import { DatabaseService } from './database.service';
import { DocumentStorageDirective } from '../directives/document-storage.directive';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://api.example.com/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private permissionService: PermissionService,
    private documentSimulator: DocumentSimulatorService,
    private databaseService: DatabaseService
  ) { }

  // Méthode pour charger les documents par chemin d'accès
  getDocumentsByPath(path: string): Observable<Document[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Document[]>(`${this.apiUrl}/documents`, {
        params: { path }
      }).pipe(
        catchError(error => {
          console.error('Error fetching documents by path', error);
          return throwError(() => new Error('Failed to load documents. Please try again later.'));
        })
      );
    } else {
      return this.databaseService.getDocumentsByPath(path).pipe(
        map(docs => this.convertToDocumentModel(docs))
      );
    }
  }

  // Méthode pour convertir les données brutes en modèle Document
  private convertToDocumentModel(rawDocs: any[]): Document[] {
    return rawDocs.map(doc => ({
      id: doc.id.toString(),
      originalName: doc.nom_origine,
      name: doc.nom,
      path: doc.chemin,
      type: this.mapDocumentType(doc.type_doc),
      creationDate: new Date(doc.date_creation),
      lastModificationDate: new Date(doc.date_derniere_modification),
      sourceInstitution: doc.institution_source,
      creator: doc.utilisateur_createur.toString(),
      lastModifier: doc.utilisateur_dernier_modificateur.toString(),
      version: doc.version,
      concernedPerson1: doc.concerne_1,
      concernedPerson2: doc.concerne_2 || undefined,
      deleted: doc.supprime === 1,
      size: doc.size || 0
    }));
  }

  pluralizeFolderName(name: string): string {
    // Vérifier si le nom est déjà au pluriel
    if (name.endsWith('s')) return name;

    // Cas spéciaux
    if (name === 'Acte de naissance') return 'Actes de naissance';
    if (name === 'Acte de mariage') return 'Actes de mariage';
    if (name === 'Acte de décès') return 'Actes de décès';
    if (name === 'Déclaration de naissance') return 'Déclarations de naissance';
    if (name === 'Déclaration de décès') return 'Déclarations de décès';
    if (name === 'Certificat de décès') return 'Certificats de décès';
    if (name === 'Publication de mariage') return 'Publications de mariage';
    if (name === 'Certificat de non opposition') return 'Certificats de non opposition';
    if (name === 'Fiche de non inscription') return 'Fiches de non inscription';
    if (name === 'Jugement supplétif') return 'Jugements supplétifs';
    if (name === 'Jugement rectificatif') return 'Jugements rectificatifs';
    if (name === 'Jugement d\'annulation') return 'Jugements d\'annulation';
    if (name === 'Jugement d\'homologation') return 'Jugements d\'homologation';
    if (name === 'Jugement déclaratif') return 'Jugements déclaratifs';

    // Cas général
    return name + 's';
  }

  // Ajouter à DocumentService.ts
  /**
   * Calcule la taille réelle d'un document à partir de son chemin
   * @param documentPath Chemin du document
   * @returns Taille du document en octets
   */
  calculateDocumentSize(documentPath: string): Observable<number> {
    if (this.authService.isApiMode()) {
      return this.http.get<{ size: number }>(`${this.apiUrl}/documents/size?path=${encodeURIComponent(documentPath)}`).pipe(
        map(response => response.size),
        catchError(error => {
          console.error('Error calculating document size', error);
          return of(0); // Retourner 0 en cas d'erreur
        })
      );
    } else {
      // En mode simulation, utiliser une taille aléatoire réaliste
      const minSize = 100 * 1024; // 100 Ko
      const maxSize = 5 * 1024 * 1024; // 5 Mo
      const randomSize = Math.floor(Math.random() * (maxSize - minSize) + minSize);
      return of(randomSize).pipe(delay(300));
    }
  }

  /**
   * Vérifie si un document est stocké localement
   * @param documentId ID du document
   * @returns true si le document est en cache
   */
  isDocumentCached(documentId: string): Observable<boolean> {
    if (this.authService.isApiMode()) {
      return this.http.get<{ cached: boolean }>(`${this.apiUrl}/documents/${documentId}/cached`).pipe(
        map(response => response.cached),
        catchError(error => {
          console.error('Error checking document cache', error);
          return of(false);
        })
      );
    } else {
      // En mode simulation, on utilise localStorage pour simuler un cache
      const cachedDocuments = localStorage.getItem('cachedDocuments');
      if (cachedDocuments) {
        try {
          const documents = JSON.parse(cachedDocuments) as string[];
          return of(documents.includes(documentId)).pipe(delay(100));
        } catch (error) {
          console.error('Error parsing cached documents', error);
          return of(false);
        }
      }
      return of(false);
    }
  }

  /**
   * Met en cache un document
   * @param documentId ID du document
   * @returns true si la mise en cache a réussi
   */
  cacheDocument(documentId: string): Observable<boolean> {
    if (this.authService.isApiMode()) {
      return this.http.post<{ success: boolean }>(`${this.apiUrl}/documents/${documentId}/cache`, {}).pipe(
        map(response => response.success),
        catchError(error => {
          console.error('Error caching document', error);
          return of(false);
        })
      );
    } else {
      // En mode simulation, on utilise localStorage pour simuler un cache
      return this.getDocumentById(documentId).pipe(
        switchMap(document => {
          if (!document) {
            return of(false);
          }

          const cachedDocuments = localStorage.getItem('cachedDocuments');
          let documents: string[] = [];

          if (cachedDocuments) {
            try {
              documents = JSON.parse(cachedDocuments) as string[];
            } catch (error) {
              console.error('Error parsing cached documents', error);
            }
          }

          if (!documents.includes(documentId)) {
            documents.push(documentId);
            localStorage.setItem('cachedDocuments', JSON.stringify(documents));
          }

          return of(true).pipe(delay(500)); // Simuler une opération de mise en cache
        })
      );
    }
  }

  // Méthode pour mapper les types de documents
  private mapDocumentType(type: string): DocumentType {
    switch (type) {
      case 'Acte de naissance': return DocumentType.BIRTH_CERTIFICATE;
      case 'Acte de mariage': return DocumentType.MARRIAGE_CERTIFICATE;
      case 'Acte de décès': return DocumentType.DEATH_CERTIFICATE;
      case 'Déclaration de naissance': return DocumentType.BIRTH_DECLARATION;
      case 'Déclaration de décès': return DocumentType.DEATH_DECLARATION;
      case 'Certificat de décès': return DocumentType.DEATH_CERTIFICATION;
      case 'Publication de mariage': return DocumentType.MARRIAGE_PUBLICATION;
      case 'Certificat de non opposition': return DocumentType.NON_OPPOSITION_CERTIFICATE;
      case 'Fiche de non inscription': return DocumentType.NON_REGISTRATION_FORM;
      case 'Jugement supplétif': return DocumentType.SUPPLEMENTARY_JUDGMENT;
      case 'Jugement rectificatif': return DocumentType.RECTIFICATION_JUDGMENT;
      case 'Jugement d\'annulation': return DocumentType.CANCELLATION_JUDGMENT;
      case 'Jugement d\'homologation': return DocumentType.HOMOLOGATION_JUDGMENT;
      case 'Jugement déclaratif': return DocumentType.DECLARATORY_JUDGMENT;
      default: return DocumentType.BIRTH_CERTIFICATE;
    }
  }

  // Méthode pour obtenir le type de document sous forme de chaîne
  getDocumentTypeString(type: DocumentType): string {
    switch (type) {
      case DocumentType.BIRTH_CERTIFICATE: return 'Acte de naissance';
      case DocumentType.MARRIAGE_CERTIFICATE: return 'Acte de mariage';
      case DocumentType.DEATH_CERTIFICATE: return 'Acte de décès';
      case DocumentType.BIRTH_DECLARATION: return 'Déclaration de naissance';
      case DocumentType.DEATH_DECLARATION: return 'Déclaration de décès';
      case DocumentType.DEATH_CERTIFICATION: return 'Certificat de décès';
      case DocumentType.MARRIAGE_PUBLICATION: return 'Publication de mariage';
      case DocumentType.NON_OPPOSITION_CERTIFICATE: return 'Certificat de non opposition';
      case DocumentType.NON_REGISTRATION_FORM: return 'Fiche de non inscription';
      case DocumentType.SUPPLEMENTARY_JUDGMENT: return 'Jugement supplétif';
      case DocumentType.RECTIFICATION_JUDGMENT: return 'Jugement rectificatif';
      case DocumentType.CANCELLATION_JUDGMENT: return 'Jugement d\'annulation';
      case DocumentType.HOMOLOGATION_JUDGMENT: return 'Jugement d\'homologation';
      case DocumentType.DECLARATORY_JUDGMENT: return 'Jugement déclaratif';
      default: return 'Type inconnu';
    }
  }

  // Mettre à jour la méthode getDocuments pour utiliser notre base de données
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
      // Convertir les critères de filtre pour notre base de données
      const dbFilters = this.convertFilterCriteriaToDbFormat(filterCriteria);
      return this.databaseService.getDocuments(dbFilters).pipe(
        map(docs => this.convertToDocumentModel(docs))
      );
    }
  }

  // Méthode pour convertir les critères de filtre
  private convertFilterCriteriaToDbFormat(criteria?: FilterCriteria): any {
    if (!criteria) return {};

    return {
      documentType: criteria.documentType ? this.getDocumentTypeString(criteria.documentType as DocumentType) : null,
      institution: criteria.sourceInstitution,
      region: criteria.region,
      startDate: criteria.startDate,
      endDate: criteria.endDate,
      concernedPerson: criteria.concernedPerson,
      path: criteria.path,
      excludeDeleted: criteria.excludeDeleted,
      searchTerm: criteria.searchTerm
    };
  }

  // Méthode pour récupérer les dossiers racine (types de documents)
  getRootFolders(): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/root`).pipe(
        catchError(error => {
          console.error('Error fetching root folders', error);
          return throwError(() => new Error('Failed to load folders. Please try again later.'));
        })
      );
    } else {
      return this.databaseService.getDocumentTypes().pipe(
        map(types => types.map(type => ({
          name: type,
          path: `/Archives/${type}/`,
          type: 'document-type' as 'document-type',
          iconClass: this.getFolderIcon({ name: type, path: '', type: 'document-type' }),
          colorClass: this.getFolderColor({ name: type, path: '', type: 'document-type' })
        })))
      );
    }
  }

  /**
 * Charge les dossiers en fonction du chemin et du mode de navigation
 * @param path Chemin du dossier à charger
 * @param navigationMode Mode de navigation (time ou location)
 * @returns Observable de la liste des dossiers
 */
  loadFolders(path: string, navigationMode: 'date' | 'location'): Observable<Folder[]> {
    // Analyser le chemin pour déterminer quel type de dossiers charger
    const pathParts = path.split('/').filter(part => part !== '');

    // Si nous sommes à la racine, retourner les dossiers racine
    if (pathParts.length <= 1) {
      return this.getRootFolders();
    }

    // Récupérer le type de document (premier élément après "Archives")
    const documentType = pathParts[1];

    if (navigationMode === 'date') {
      // Navigation par temps
      if (pathParts.length === 2) {
        // Niveau des années
        return this.getYearFolders(documentType);
      } else if (pathParts.length === 3) {
        // Niveau des mois
        return this.getMonthFolders(`/Archives/${documentType}/${pathParts[2]}/`);
      } else if (pathParts.length === 4) {
        // Niveau des jours
        return this.getDayFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/`);
      }
    } else {
      // Navigation par lieu
      if (pathParts.length === 2) {
        // Niveau des régions
        return this.getRegionFolders(documentType);
      } else if (pathParts.length === 3) {
        // Niveau des cercles pour une région
        return this.getCircleFolders(`/Archives/${documentType}/${pathParts[2]}/`);
      } else if (pathParts.length === 4) {
        // Niveau des communes pour un cercle
        return this.getCommuneFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/`);
      } else if (pathParts.length === 5) {
        if (pathParts[5] === "Centre d'état civil" || pathParts[5] === "Centre de déclaration" || pathParts[5] === "Tribunal") {
          // Cas où nous sommes dans un type spécifique de centre
          if (pathParts[5] === "Centre d'état civil") {
            return this.getCivilStatusCenterFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/Centre d'état civil/`);
          } else if (pathParts[5] === "Centre de déclaration") {
            return this.getDeclarationCenterFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/Centre de déclaration/`);
          } else {
            return this.getTribunalFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/Tribunal/`);
          }
        } else {
          // Niveau des centres pour une commune
          const communePath = `/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/`;
          return this.getCivilStatusCenterFolders(communePath);
        }
      }
    }

    // Par défaut, retourner un tableau vide
    return of([]);
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
      return this.databaseService.getYearsByDocumentType(documentType).pipe(
        map(years => years.map(year => ({
          name: year.toString(),
          path: `/Archives/${documentType}/${year}/`,
          type: 'year' as 'year',
          iconClass: 'bi-calendar-year',
          colorClass: 'text-primary',
          lastModificationDate: new Date(year, 11, 31)
        })))
      );
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
      const pathParts = yearPath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const yearStr = pathParts[pathParts.length - 1];
      const year = parseInt(yearStr, 10);

      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];

      return this.databaseService.getMonthsByYearAndType(docType, year).pipe(
        map(months => months.map(month => ({
          name: monthNames[month - 1],
          path: `${yearPath}${month}/`,
          type: 'month' as 'month',
          iconClass: 'bi-calendar-month',
          colorClass: 'text-success',
          lastModificationDate: new Date(year, month - 1, 28)
        })))
      );
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
      // Extraire les parties du chemin
      const pathParts = monthPath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const yearStr = pathParts[pathParts.length - 2];
      const monthStr = pathParts[pathParts.length - 1];

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      return this.databaseService.getDaysByMonthYearAndType(docType, year, month).pipe(
        map(days => days.map(day => ({
          name: day.toString().padStart(2, '0'),
          path: `${monthPath}${day.toString().padStart(2, '0')}/`,
          type: 'day' as 'day',
          iconClass: 'bi-calendar-day',
          colorClass: 'text-info',
          lastModificationDate: new Date(year, month - 1, day)
        })))
      );
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
      return this.databaseService.getRegions().pipe(
        map(regions => regions.map(region => ({
          name: region.nom,
          path: `/Archives/${documentType}/${region.nom}/`,
          type: 'region' as 'region',
          iconClass: 'bi-geo-alt',
          colorClass: 'text-danger'
        })))
      );
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
      // Extraire les parties du chemin
      const pathParts = regionPath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const regionName = pathParts[pathParts.length - 1];

      // Trouver l'ID de la région pour récupérer ses cercles
      return this.databaseService.getRegions().pipe(
        switchMap(regions => {
          const region = regions.find(r => r.nom === regionName);
          if (!region) {
            return of([]);
          }

          return this.databaseService.getCerclesByRegion(region.id).pipe(
            map(cercles => cercles.map(cercle => ({
              name: cercle.nom,
              path: `${regionPath}${cercle.nom}/`,
              type: 'circle' as 'circle',
              iconClass: 'bi-circle',
              colorClass: 'text-warning'
            })))
          );
        })
      );
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
      // Extraire les parties du chemin
      const pathParts = circlePath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const regionName = pathParts[pathParts.length - 2];
      const cercleName = pathParts[pathParts.length - 1];

      // Trouver l'ID du cercle pour récupérer ses communes
      return this.databaseService.getRegions().pipe(
        switchMap(regions => {
          const region = regions.find(r => r.nom === regionName);
          if (!region) {
            return of([]);
          }

          return this.databaseService.getCerclesByRegion(region.id).pipe(
            switchMap(cercles => {
              const cercle = cercles.find(c => c.nom === cercleName);
              if (!cercle) {
                return of([]);
              }

              return this.databaseService.getCommunesByCercle(cercle.id).pipe(
                map(communes => communes.map(commune => ({
                  name: commune.nom,
                  path: `${circlePath}${commune.nom}/`,
                  type: 'commune' as 'commune',
                  iconClass: 'bi-building',
                  colorClass: 'text-purple'
                })))
              );
            })
          );
        })
      );
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
      // Extraire les parties du chemin
      const pathParts = communePath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const regionName = pathParts[pathParts.length - 3];
      const cercleName = pathParts[pathParts.length - 2];
      const communeName = pathParts[pathParts.length - 1];

      // Trouver l'ID de la commune pour récupérer ses centres
      return this.databaseService.getRegions().pipe(
        switchMap(regions => {
          const region = regions.find(r => r.nom === regionName);
          if (!region) {
            return of([]);
          }

          return this.databaseService.getCerclesByRegion(region.id).pipe(
            switchMap(cercles => {
              const cercle = cercles.find(c => c.nom === cercleName);
              if (!cercle) {
                return of([]);
              }

              return this.databaseService.getCommunesByCercle(cercle.id).pipe(
                switchMap(communes => {
                  const commune = communes.find(c => c.nom === communeName);
                  if (!commune) {
                    return of([]);
                  }

                  return this.databaseService.getCentresEtatCivilByCommune(commune.id).pipe(
                    map(centres => centres.map(centre => ({
                      name: centre.nom,
                      path: `${communePath}Centre d'état civil/${centre.nom}/`,
                      type: 'center' as 'center',
                      iconClass: 'bi-house-door',
                      colorClass: 'text-teal'
                    })))
                  );
                })
              );
            })
          );
        })
      );
    }
  }

  getDeclarationCenterFolders(communePath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/declaration-centers`, {
        params: new HttpParams().set('communePath', communePath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching declaration center folders', error);
          return throwError(() => new Error('Échec du chargement des centres de déclaration.'));
        })
      );
    } else {
      // Extraire les parties du chemin
      const pathParts = communePath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const regionName = pathParts[pathParts.length - 3];
      const cercleName = pathParts[pathParts.length - 2];
      const communeName = pathParts[pathParts.length - 1];

      // Trouver l'ID de la commune pour récupérer ses centres
      return this.databaseService.getRegions().pipe(
        switchMap(regions => {
          const region = regions.find(r => r.nom === regionName);
          if (!region) {
            return of([]);
          }

          return this.databaseService.getCerclesByRegion(region.id).pipe(
            switchMap(cercles => {
              const cercle = cercles.find(c => c.nom === cercleName);
              if (!cercle) {
                return of([]);
              }

              return this.databaseService.getCommunesByCercle(cercle.id).pipe(
                switchMap(communes => {
                  const commune = communes.find(c => c.nom === communeName);
                  if (!commune) {
                    return of([]);
                  }

                  return this.databaseService.getCentresDeclarationByCommune(commune.id).pipe(
                    map(centres => centres.map(centre => ({
                      name: centre.nom,
                      path: `${communePath}Centre de déclaration/${centre.nom}/`,
                      type: 'center' as 'center',
                      iconClass: 'bi-building-check',
                      colorClass: 'text-info'
                    })))
                  );
                })
              );
            })
          );
        })
      );
    }
  }

  getTribunalFolders(communePath: string): Observable<Folder[]> {
    if (this.authService.isApiMode()) {
      return this.http.get<Folder[]>(`${this.apiUrl}/folders/tribunals`, {
        params: new HttpParams().set('communePath', communePath)
      }).pipe(
        catchError(error => {
          console.error('Error fetching tribunal folders', error);
          return throwError(() => new Error('Échec du chargement des tribunaux.'));
        })
      );
    } else {
      // Extraire les parties du chemin
      const pathParts = communePath.split('/').filter(part => part !== '');
      const docType = pathParts[1];
      const regionName = pathParts[pathParts.length - 3];
      const cercleName = pathParts[pathParts.length - 2];
      const communeName = pathParts[pathParts.length - 1];

      // Trouver l'ID de la commune pour récupérer ses tribunaux
      return this.databaseService.getRegions().pipe(
        switchMap(regions => {
          const region = regions.find(r => r.nom === regionName);
          if (!region) {
            return of([]);
          }

          return this.databaseService.getCerclesByRegion(region.id).pipe(
            switchMap(cercles => {
              const cercle = cercles.find(c => c.nom === cercleName);
              if (!cercle) {
                return of([]);
              }

              return this.databaseService.getCommunesByCercle(cercle.id).pipe(
                switchMap(communes => {
                  const commune = communes.find(c => c.nom === communeName);
                  if (!commune) {
                    return of([]);
                  }

                  return this.databaseService.getTribunauxByCommune(commune.id).pipe(
                    map(tribunaux => tribunaux.map(tribunal => ({
                      name: tribunal.nom,
                      path: `${communePath}Tribunal/${tribunal.nom}/`,
                      type: 'center' as 'center',
                      iconClass: 'bi-bank',
                      colorClass: 'text-secondary'
                    })))
                  );
                })
              );
            })
          );
        })
      );
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
      // Récupérer d'abord les informations du document
      return this.getDocumentById(documentId).pipe(
        switchMap(document => {
          if (!document) {
            return throwError(() => new Error('Document not found'));
          }

          // Récupérer le chemin du document
          const filePath = document.path;

          // En mode développement, nous pouvons utiliser un fetch pour récupérer le fichier local
          return this.fetchLocalFile(filePath, true).pipe(
            tap(() => {
              // Enregistrer l'action de visualisation
              this.recordDocumentAction(documentId, ActionType.VIEW).subscribe();
            })
          );
        })
      );
    }
  }

  // Méthode auxiliaire pour récupérer un fichier local
  private fetchLocalFile(filePath: string, isPreview: boolean = false): Observable<Blob> {
    return new Observable<Blob>(observer => {
      fetch(filePath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          observer.next(blob);
          observer.complete();
        })
        .catch(error => {
          console.error('Error fetching local file:', error);

          // Si le fichier n'est pas trouvé, générer un PDF simulé
          const simulatedPdf = this.documentSimulator.generateSimulatedPdf(
            filePath.split('/').pop() || 'document.pdf',
            'Document simulé',
            isPreview
          );

          observer.next(simulatedPdf);
          observer.complete();
        });
    }).pipe(delay(isPreview ? 350 : 800)); // Simuler un délai réseau plus court pour la prévisualisation
  }

  // Méthode pour récupérer un document par son ID
  getDocumentById(documentId: string): Observable<Document | null> {
    if (this.authService.isApiMode()) {
      return this.http.get<Document>(`${this.apiUrl}/documents/${documentId}`).pipe(
        catchError(error => {
          console.error('Error fetching document', error);
          return of(null);
        })
      );
    } else {
      // Utiliser le service de base de données
      return this.databaseService.getDocumentById(parseInt(documentId)).pipe(
        map(doc => doc ? this.convertToDocumentModel([doc])[0] : null)
      );
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
      return this.getDocumentById(documentId).pipe(
        switchMap(document => {
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
        })
      );
    }
  }

  // Méthode pour obtenir les versions d'un document
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
      return this.getDocumentById(documentId).pipe(
        switchMap(document => {
          if (!document) {
            return throwError(() => new Error('Document not found'));
          }

          const versions: Document[] = [{ ...document }];

          // Ajouter des versions antérieures si la version actuelle est supérieure à 1
          if (document.version > 1) {
            for (let i = document.version - 1; i >= 1; i--) {
              versions.push({
                ...document,
                id: `${document.id}_v${i}`,
                version: i,
                lastModificationDate: new Date(document.lastModificationDate.getTime() - (document.version - i) * 7 * 24 * 60 * 60 * 1000)
              });
            }
          }

          return of(versions);
        })
      );
    }
  }

  // Méthode pour télécharger un document
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
          // Récupérer d'abord les informations du document
          return this.getDocumentById(documentId).pipe(
            switchMap(document => {
              if (!document) {
                return throwError(() => new Error('Document not found'));
              }

              // Récupérer le chemin du document
              const filePath = document.path;

              // En mode développement, nous pouvons utiliser un fetch pour récupérer le fichier local
              return this.fetchLocalFile(filePath).pipe(
                tap(() => {
                  // Enregistrer l'action de téléchargement
                  this.recordDocumentAction(documentId, ActionType.DOWNLOAD).subscribe();
                })
              );
            })
          );
        }
      })
    );
  }

  // Méthode pour partager un document par email
  shareDocumentByEmail(documentId: string, emailAddress: string, options?: {
    subject?: string,
    message?: string,
    includePreview?: boolean
  }): Observable<boolean> {
    // Vérifier les permissions avant de partager
    return this.permissionService.checkPermission(
      PermissionType.SHARE,
      'document',
      documentId
    ).pipe(
      switchMap(result => {
        if (!result.granted) {
          return throwError(() => new Error(result.reason || 'Permission denied'));
        }

        if (this.authService.isApiMode()) {
          return this.http.post<boolean>(`${this.apiUrl}/documents/${documentId}/share`, {
            emailAddress,
            subject: options?.subject || 'Partage de document',
            message: options?.message || 'Veuillez trouver ci-joint le document demandé.',
            includePreview: options?.includePreview !== undefined ? options.includePreview : true
          }).pipe(
            tap(() => {
              // Enregistrer l'action de partage
              this.recordDocumentAction(
                documentId,
                ActionType.SHARE,
                `Partagé avec ${emailAddress}`
              ).subscribe();
            }),
            catchError(error => {
              console.error('Error sharing document', error);
              return throwError(() => new Error('Failed to share document. Please try again later.'));
            })
          );
        } else {
          // En mode simulation, enregistrer l'action et retourner un succès après un délai
          console.log(`Document ${documentId} partagé avec ${emailAddress}`);
          console.log('Options:', options);

          // Enregistrer l'action de partage
          this.recordDocumentAction(
            documentId,
            ActionType.SHARE,
            `Partagé avec ${emailAddress}`
          ).subscribe();

          return of(true).pipe(delay(800));
        }
      })
    );
  }

  // Fonction utilitaire pour obtenir l'icône en fonction du type de dossier
  getFolderIcon(folder: Folder): string {
    switch (folder.type) {
      case 'document-type':

        return 'bi-folder-fill';
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
        return 'bi-folder-fill';
    }
  }

  // Fonction utilitaire pour obtenir la couleur en fonction du type de dossier
  getFolderColor(folder: Folder): string {
    switch (folder.type) {
      case 'document-type':

        return 'text-warning';
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
}