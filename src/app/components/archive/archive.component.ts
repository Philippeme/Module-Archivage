import { Component, OnInit } from '@angular/core';
import { Document, Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit {
  viewMode: 'list' | 'grid' = 'list';
  navigationMode: 'time' | 'location' = 'time';
  currentPath: string = '/Archives';
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

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit(): void {
    // Charger les préférences utilisateur
    this.loadUserPreferences();

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

      this.loadFolderContent();
    });
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
  }

  saveUserPreferences(): void {
    // Sauvegarder les préférences dans le localStorage
    localStorage.setItem('archiveViewMode', this.viewMode);
    localStorage.setItem('archiveNavigationMode', this.navigationMode);
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
    this.documentService.getDocuments({ path: this.currentPath }).subscribe({
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
    // Naviguer vers le dossier sélectionné
    this.currentPath = folder.path;
    this.updateBreadcrumb();

    // Mettre à jour l'URL sans recharger la page
    this.updateUrlParams();

    // Ajouter à l'historique de navigation
    this.addToHistory(this.currentPath);

    // Charger le contenu du dossier
    this.loadFolderContent();
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
        mode: this.navigationMode
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
  }

  openDocument(document: Document): void {
    this.selectedDocument = document;
    // Ici, ouvrir une modal ou un panneau latéral pour afficher le document
  }

  closePreview(): void {
    this.selectedDocument = null;
  }

  // Gestion de l'historique de navigation

  addToHistory(path: string): void {
    // Supprimer tout ce qui se trouve après l'index actuel
    this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    this.navigationHistory.push(path);
    this.historyIndex = this.navigationHistory.length - 1;

    // Ne pas ajouter si le chemin est identique au dernier
    if (this.navigationHistory.length > 0 &&
      this.navigationHistory[this.historyIndex] === path) {
      return;
    }

    // Ajouter le nouveau chemin s'il est différent du dernier
    if (this.navigationHistory[this.navigationHistory.length - 1] !== path) {
      this.navigationHistory.push(path);
      this.historyIndex = this.navigationHistory.length - 1;
    }
  }

  navigateBack(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentPath = this.navigationHistory[this.historyIndex];
      this.updateBreadcrumb();
      this.updateUrlParams();
      this.loadFolderContent();
    }
  }

  navigateForward(): void {
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.historyIndex++;
      this.currentPath = this.navigationHistory[this.historyIndex];
      this.updateBreadcrumb();
      this.updateUrlParams();
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
    // Ouvrir le dossier dans un nouvel onglet
    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        path: folder.path,
        mode: this.navigationMode
      }
    }).toString();

    window.open(url, '_blank');
  }

  applyFilters(filters: any): void {
    // Appliquer les filtres à la liste des documents
    this.documentService.getDocuments({ ...filters, path: this.currentPath }).subscribe({
      next: (documents) => {
        this.currentDocuments = documents;
      },
      error: (error) => {
        console.error('Error applying filters', error);
        this.errorMessage = `Erreur lors de l'application des filtres: ${error.message}`;
      }
    });
  }
}