import { Component, OnDestroy, OnInit } from '@angular/core';
import { Document, Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FilterCriteria } from '../../models/filter.model';
import { FilterService } from '../../services/filter.service';
import { Subject, takeUntil } from 'rxjs';
import { PermissionService } from '../../services/permission.service';
import { PermissionType } from '../../models/permission.model';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit, OnDestroy {
  viewMode: 'list' | 'grid' = 'list';
  navigationMode: 'time' | 'location' = 'time';
  currentPath: string = '/Archives';
  sidebarMode: 'tree' | 'quick' = 'tree';
  breadcrumbSegments: { name: string; path: string }[] = [
    { name: 'Archives', path: '/Archives' }
  ];
  currentFolders: Folder[] = [];
  currentDocuments: Document[] = [];
  selectedDocument: Document | null = null;
  isLoading = false;
  errorMessage = '';
  navigationHistory: string[] = ['/Archives'];
  historyIndex = 0;
  
  // Nouvelles propriétés pour la recherche et le filtrage
  isSearchMode = false;
  searchTerm = '';
  currentFilter: FilterCriteria | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private filterService: FilterService,
    private permissionService: PermissionService
  ) { }

  ngOnInit(): void {
    // Charger les préférences utilisateur
    this.loadUserPreferences();

    // S'abonner aux changements de filtre
    this.filterService.currentFilter$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filter => {
      this.currentFilter = filter?.criteria || null;
      
      // Si nous sommes en mode recherche, mettre à jour les résultats
      if (this.isSearchMode) {
        this.applyFilters(this.currentFilter || {});
      }
    });

    // Récupérer le chemin depuis les paramètres d'URL, s'il existe
    this.route.queryParams.subscribe(params => {
      if (params['path']) {
        this.currentPath = params['path'];
        this.updateBreadcrumb();
        this.navigationHistory = [this.currentPath];
        this.historyIndex = 0;
      }

      if (params['mode']) {
        this.navigationMode = params['mode'] as 'time' | 'location';
      }
      
      if (params['search']) {
        this.searchTerm = params['search'];
        this.isSearchMode = true;
      } else {
        this.isSearchMode = false;
        this.loadFolderContent();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserPreferences(): void {
    // Charger les préférences depuis le localStorage
    const storedViewMode = localStorage.getItem('archiveViewMode');
    if (storedViewMode) {
      this.viewMode = storedViewMode as 'list' | 'grid';
    }

    const storedNavigationMode = localStorage.getItem('archiveNavigationMode');
    if (storedNavigationMode) {
      this.navigationMode = storedNavigationMode as 'time' | 'location';
    }
    
    const storedSidebarMode = localStorage.getItem('archiveSidebarMode');
    if (storedSidebarMode) {
      this.sidebarMode = storedSidebarMode as 'tree' | 'quick';
    }
  }

  saveUserPreferences(): void {
    // Sauvegarder les préférences dans le localStorage
    localStorage.setItem('archiveViewMode', this.viewMode);
    localStorage.setItem('archiveNavigationMode', this.navigationMode);
    localStorage.setItem('archiveSidebarMode', this.sidebarMode);
  }

  loadFolderContent(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Nettoyer le chemin actuel avant de charger les dossiers
    const cleanedPath = this.cleanupPath(this.currentPath);
    this.currentPath = cleanedPath;

    // Charger les dossiers selon le mode de navigation
    this.documentService.loadFolders(cleanedPath, this.navigationMode).subscribe({
      next: (folders) => {
        this.currentFolders = folders.map(folder => ({
          ...folder,
          iconClass: this.documentService.getFolderIcon(folder),
          colorClass: this.documentService.getFolderColor(folder)
        }));

        // Charger les documents du dossier actuel
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Error loading folders', error);
        this.errorMessage = `Erreur lors du chargement des dossiers: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadDocuments(): void {
    // Utiliser le filtre courant avec le chemin actuel
    const filter: FilterCriteria = {
      ...(this.currentFilter || {}),
      path: this.currentPath
    };
    
    this.documentService.getDocuments(filter).subscribe({
      next: (documents) => {
        this.currentDocuments = documents;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading documents', error);
        this.errorMessage = `Erreur lors du chargement des documents: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  openFolder(folder: Folder): void {
    // Vérifier les permissions
    this.permissionService.checkPermission(PermissionType.VIEW, 'folder', folder.path).subscribe({
      next: (result) => {
        if (result.granted) {
          // Naviguer vers le dossier sélectionné
          this.currentPath = folder.path;
          this.updateBreadcrumb();

          // Mettre à jour l'URL sans recharger la page
          this.updateUrlParams();

          // Ajouter à l'historique de navigation
          this.addToHistory(this.currentPath);

          // Charger le contenu du dossier
          this.loadFolderContent();
          
          // Désactiver le mode recherche
          this.isSearchMode = false;
          this.searchTerm = '';
        } else {
          this.errorMessage = result.reason || 'Accès refusé à ce dossier';
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification des permissions', error);
        this.errorMessage = 'Erreur lors de la vérification des permissions';
      }
    });
  }

  updateBreadcrumb(): void {
    // Nettoyer le chemin actuel avant de construire le fil d'Ariane
    const cleanedPath = this.cleanupPath(this.currentPath);
    this.currentPath = cleanedPath;
    
    const pathSegments = cleanedPath.split('/').filter(segment => segment !== '');
    
    this.breadcrumbSegments = [
      { name: 'Archives', path: '/Archives' }
    ];
    
    let currentPath = '/Archives';
    
    for (let i = 0; i < pathSegments.length; i++) {
      if (pathSegments[i] !== 'Archives') {
        currentPath += `/${pathSegments[i]}`;
        
        // Pour les segments numériques, vérifier s'il s'agit d'une année
        if (/^\d+$/.test(pathSegments[i]) && pathSegments[i].length === 4) {
          // C'est probablement une année
          this.breadcrumbSegments.push({
            name: pathSegments[i].substring(0, 4), // Prendre seulement les 4 premiers chiffres
            path: currentPath
          });
        } else {
          this.breadcrumbSegments.push({
            name: pathSegments[i],
            path: currentPath
          });
        }
      }
    }
  }

  updateUrlParams(): void {
    // Mettre à jour les paramètres d'URL sans recharger la page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        path: this.currentPath,
        mode: this.navigationMode,
        search: this.isSearchMode ? this.searchTerm : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  navigateToBreadcrumb(segment: { name: string; path: string }, event: Event): void {
    event.preventDefault();
    
    // Nettoyer tout comportement anormal dans le chemin actuel
    const cleanPath = this.cleanupPath(segment.path);
    
    // Naviguer vers le segment du fil d'Ariane
    this.currentPath = cleanPath;
    this.updateBreadcrumb();
    this.updateUrlParams();
    
    // Ajouter à l'historique de navigation
    this.addToHistory(this.currentPath);
    
    // Charger le contenu du dossier
    this.loadFolderContent();
    
    // Désactiver le mode recherche
    this.isSearchMode = false;
    this.searchTerm = '';
  }
  
  // Méthode pour nettoyer les chemins anormaux
  private cleanupPath(path: string): string {
    // Correction des années anormales (20241, 202411, etc.)
    return path.replace(/\/(\d{4})\d+\//g, '/$1/');
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
    this.saveUserPreferences();
  }

  setNavigationMode(mode: 'time' | 'location'): void {
    if (this.currentPath === '/Archives') {
      return; // Ne pas changer le mode si nous sommes à la racine
    }

    this.navigationMode = mode;
    this.saveUserPreferences();

    // Réinitialiser la navigation au dossier racine du type de document actuel
    const pathSegments = this.currentPath.split('/').filter(segment => segment !== '');

    if (pathSegments.length > 1) {
      // Si nous sommes déjà dans un type de document, rester dans ce type
      this.currentPath = `/Archives/${pathSegments[1]}`;
    } else {
      // Sinon, revenir à la racine
      this.currentPath = '/Archives';
    }

    this.updateBreadcrumb();
    this.updateUrlParams();

    // Ajouter à l'historique de navigation
    this.addToHistory(this.currentPath);

    // Charger le contenu du dossier
    this.loadFolderContent();
    
    // Désactiver le mode recherche
    this.isSearchMode = false;
  }
  
  setSidebarMode(mode: 'tree' | 'quick'): void {
    this.sidebarMode = mode;
    this.saveUserPreferences();
  }

  openDocument(document: Document): void {
    // Vérifier les permissions avant d'ouvrir
    this.permissionService.checkPermission(PermissionType.VIEW, 'document', document.id).subscribe({
      next: (result) => {
        if (result.granted) {
          this.selectedDocument = document;
        } else {
          this.errorMessage = result.reason || 'Accès refusé à ce document';
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification des permissions', error);
        this.errorMessage = 'Erreur lors de la vérification des permissions';
      }
    });
  }

  closePreview(): void {
    this.selectedDocument = null;
  }

  // Gestion de l'historique de navigation
  addToHistory(path: string): void {
    // Supprimer tout ce qui se trouve après l'index actuel
    this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    
    // Ne pas ajouter si le chemin est identique au dernier
    if (this.navigationHistory.length > 0 &&
      this.navigationHistory[this.historyIndex] === path) {
      return;
    }
    
    // Ajouter le nouveau chemin
    this.navigationHistory.push(path);
    this.historyIndex = this.navigationHistory.length - 1;
  }

  navigateBack(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentPath = this.navigationHistory[this.historyIndex];
      this.updateBreadcrumb();
      this.updateUrlParams();
      
      // Si nous sommes en mode recherche, revenir en mode navigation
      if (this.isSearchMode) {
        this.isSearchMode = false;
      }
      
      this.loadFolderContent();
    }
  }

  navigateForward(): void {
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.historyIndex++;
      this.currentPath = this.navigationHistory[this.historyIndex];
      this.updateBreadcrumb();
      this.updateUrlParams();
      
      // Si nous sommes en mode recherche, revenir en mode navigation
      if (this.isSearchMode) {
        this.isSearchMode = false;
      }
      
      this.loadFolderContent();
    }
  }

  canNavigateBack(): boolean {
    return this.historyIndex > 0;
  }

  canNavigateForward(): boolean {
    return this.historyIndex < this.navigationHistory.length - 1;
  }

  openInNewTab(folder: Folder): void {
    // Créer l'URL avec les paramètres du dossier
    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        path: folder.path,
        mode: this.navigationMode,
        view: this.viewMode,
        source: 'newtab'
      }
    }).toString();

    // Ouvrir dans un nouvel onglet
    window.open(url, '_blank');
    
    // Enregistrer dans l'historique de navigation local (facultatif)
    localStorage.setItem(`lastOpenedFolder_${folder.path}`, JSON.stringify({
      time: new Date().getTime(),
      name: folder.name,
      path: folder.path,
      mode: this.navigationMode
    }));
  }

  openMultipleTabsForFolders(folders: Folder[]): void {
    // Limiter le nombre d'onglets à ouvrir pour éviter le blocage par le navigateur
    const maxTabs = 5;
    const foldersToOpen = folders.slice(0, maxTabs);
    
    if (folders.length > maxTabs) {
      alert(`Pour des raisons de sécurité, seuls les ${maxTabs} premiers dossiers seront ouverts.`);
    }
    
    // Ouvrir chaque dossier dans un nouvel onglet
    foldersToOpen.forEach(folder => {
      setTimeout(() => {
        this.openInNewTab(folder);
      }, 100); // Léger délai pour éviter les problèmes avec certains navigateurs
    });
  }

  applyFilters(filters: FilterCriteria): void {
    // Mettre à jour le filtre courant
    this.currentFilter = filters;
    
    // Si nous sommes en mode navigation, appliquer les filtres aux documents actuels
    if (!this.isSearchMode) {
      this.loadDocuments();
    } else {
      // En mode recherche, rafraîchir les résultats
      // La mise à jour du filtre déclenchera automatiquement la mise à jour des résultats
    }
  }
  
  onSearch(term: string): void {
    this.searchTerm = term;
    
    if (term) {
      // Activer le mode recherche
      this.isSearchMode = true;
      
      // Mettre à jour l'URL
      this.updateUrlParams();
      
      // Ajouter à l'historique de navigation
      this.addToHistory(this.currentPath);
    } else {
      // Si le terme est vide, revenir en mode navigation
      this.isSearchMode = false;
      this.loadFolderContent();
    }
  }
}