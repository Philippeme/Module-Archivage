import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { Document, Folder, DocumentType } from '../../models/document.model';
import { FilterCriteria, SavedFilter } from '../../models/filter.model';
import { DocumentService } from '../../services/document.service';
import { FilterService } from '../../services/filter.service';
import { PermissionService } from '../../services/permission.service';
import { PermissionType } from '../../models/permission.model';
import { DatabaseService } from '../../services/database.service';
import { SaveFilterDialogComponent } from '../save-filter-dialog/save-filter-dialog.component';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit, OnDestroy {
  viewMode: 'list' | 'grid' = 'list';
  navigationMode: 'date' | 'location' = 'date'; // Renommé de 'time' à 'date'
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
  successMessage = '';
  navigationHistory: string[] = ['/Archives'];
  historyIndex = 0;
  isAtLastLevel = false;

  // Propriétés pour la recherche et le filtrage
  isSearchMode = false;
  searchTerm = '';
  currentFilter: FilterCriteria | null = null;
  isFilterExpanded = false;
  savedFilters: SavedFilter[] = [];

  // Propriétés pour la navigation géographique
  documentTypes = Object.values(DocumentType);
  availableRegions: any[] = [];
  selectedRegion: any = null;
  availableCercles: any[] = [];
  selectedCercle: any = null;
  availableCommunes: any[] = [];
  selectedCommune: any = null;
  availableCentresEtatCivil: any[] = [];
  selectedCentre: any = null;
  availableCentresDeclaration: any[] = [];
  availableTribunaux: any[] = [];
  selectedTribunal: any = null;

  // Mini-filtres pour la sélection combinée
  showYearFilter = false;
  showMonthFilter = false;
  showDayFilter = false;
  showRegionFilter = false;
  showCercleFilter = false;
  showCommuneFilter = false;

  // Valeurs sélectionnées
  selectedYear: number | null = null;
  selectedMonth: number | null = null;
  selectedDay: number | null = null;


  // Options disponibles
  availableYears: number[] = [];
  availableMonths = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];
  availableDays: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private filterService: FilterService,
    private permissionService: PermissionService,
    private databaseService: DatabaseService,
    private dialog: MatDialog
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
        this.navigationMode = params['mode'] as 'date' | 'location';
      }

      if (params['search']) {
        this.searchTerm = params['search'];
        this.isSearchMode = true;
      } else {
        this.isSearchMode = false;
        this.loadFolderContent();
      }
    });

    // Charger les régions disponibles
    this.loadRegions();

    // Charger les filtres sauvegardés
    this.loadSavedFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Ajouter dans le ngOnInit ou une autre méthode appropriée
  loadRegionsForFilters(): void {
    this.databaseService.getRegions().subscribe({
      next: (regions) => {
        this.availableRegions = regions;
        this.updateFilterVisibility();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des régions', error);
      }
    });
  }

  loadYearsForFilters(documentType: string): void {
    this.databaseService.getYearsByDocumentType(documentType).subscribe({
      next: (years) => {
        this.availableYears = years;
        this.updateFilterVisibility();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des années', error);
      }
    });
  }

  // Méthodes pour les mini-filtres
  updateFilterVisibility(): void {
    // Analyser le chemin courant pour déterminer quels filtres afficher
    const pathParts = this.currentPath.split('/').filter(part => part !== '');

    if (pathParts.length <= 1) {
      this.resetFilterVisibility();
      return;
    }

    const documentType = pathParts[1];

    if (this.navigationMode === 'date') {
      this.showYearFilter = pathParts.length >= 2;
      this.showMonthFilter = pathParts.length >= 3;
      this.showDayFilter = pathParts.length >= 4;

      // Charger les données nécessaires
      if (this.showYearFilter && this.availableYears.length === 0) {
        this.loadYearsForFilters(documentType);
      }

      if (this.showMonthFilter && pathParts.length >= 3) {
        const year = parseInt(pathParts[2], 10);
        this.selectedYear = year;
        this.loadMonthsForYear(documentType, year);
      }

      if (this.showDayFilter && pathParts.length >= 4) {
        const year = parseInt(pathParts[2], 10);
        const month = parseInt(pathParts[3], 10);
        this.selectedMonth = month;
        this.loadDaysForMonth(documentType, year, month);
      }
    } else {
      this.showRegionFilter = pathParts.length >= 2;
      this.showCercleFilter = pathParts.length >= 3;
      this.showCommuneFilter = pathParts.length >= 4;

      // Charger les données nécessaires
      if (this.showRegionFilter && this.availableRegions.length === 0) {
        this.loadRegionsForFilters();
      }

      if (this.showCercleFilter && pathParts.length >= 3) {
        const regionName = pathParts[2];
        const region = this.availableRegions.find(r => r.nom === regionName);
        if (region) {
          this.selectedRegion = region;
          this.loadCerclesForRegion(region.id);
        }
      }

      if (this.showCommuneFilter && pathParts.length >= 4) {
        const cercleName = pathParts[3];
        const cercle = this.availableCercles.find(c => c.nom === cercleName);
        if (cercle) {
          this.selectedCercle = cercle;
          this.loadCommunesForCercle(cercle.id);
        }
      }
    }
  }

  resetFilterVisibility(): void {
    this.showYearFilter = false;
    this.showMonthFilter = false;
    this.showDayFilter = false;
    this.showRegionFilter = false;
    this.showCercleFilter = false;
    this.showCommuneFilter = false;

    this.selectedYear = null;
    this.selectedMonth = null;
    this.selectedDay = null;
    this.selectedRegion = null;
    this.selectedCercle = null;
    this.selectedCommune = null;
  }

  loadMonthsForYear(documentType: string, year: number): void {
    this.databaseService.getMonthsByYearAndType(documentType, year).subscribe({
      next: (months) => {
        // Filtrer les mois disponibles
        this.availableMonths = this.availableMonths.filter(m => months.includes(m.value));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des mois', error);
      }
    });
  }

  loadDaysForMonth(documentType: string, year: number, month: number): void {
    this.databaseService.getDaysByMonthYearAndType(documentType, year, month).subscribe({
      next: (days) => {
        this.availableDays = days;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des jours', error);
      }
    });
  }

  loadCerclesForRegion(regionId: number): void {
    this.databaseService.getCerclesByRegion(regionId).subscribe({
      next: (cercles) => {
        this.availableCercles = cercles;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des cercles', error);
      }
    });
  }

  loadCommunesForCercle(cercleId: number): void {
    this.databaseService.getCommunesByCercle(cercleId).subscribe({
      next: (communes) => {
        this.availableCommunes = communes;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des communes', error);
      }
    });
  }

  // Gestionnaires d'événements pour les mini-filtres
  onYearFilterChange(): void {
    if (this.selectedYear) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedYear}/`);
      this.loadMonthsForYear(documentType, this.selectedYear);
    }
  }

  onMonthFilterChange(): void {
    if (this.selectedYear && this.selectedMonth) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedYear}/${this.selectedMonth}/`);
      this.loadDaysForMonth(documentType, this.selectedYear, this.selectedMonth);
    }
  }

  onDayFilterChange(): void {
    if (this.selectedYear && this.selectedMonth && this.selectedDay) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedYear}/${this.selectedMonth}/${this.selectedDay}/`);
    }
  }

  onRegionFilterChange(): void {
    if (this.selectedRegion) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedRegion.nom}/`);
      this.loadCerclesForRegion(this.selectedRegion.id);
    }
  }

  onCercleFilterChange(): void {
    if (this.selectedRegion && this.selectedCercle) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/`);
      this.loadCommunesForCercle(this.selectedCercle.id);
    }
  }

  onCommuneFilterChange(): void {
    if (this.selectedRegion && this.selectedCercle && this.selectedCommune) {
      const documentType = this.currentPath.split('/').filter(part => part !== '')[1];
      this.navigateToPath(`/Archives/${documentType}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/${this.selectedCommune.nom}/`);
    }
  }




  loadUserPreferences(): void {
    // Charger les préférences depuis le localStorage
    const storedViewMode = localStorage.getItem('archiveViewMode');
    if (storedViewMode) {
      this.viewMode = storedViewMode as 'list' | 'grid';
    }

    const storedNavigationMode = localStorage.getItem('archiveNavigationMode');
    if (storedNavigationMode) {
      this.navigationMode = storedNavigationMode as 'date' | 'location';
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

  loadSavedFilters(): void {
    this.filterService.getSavedFilters().subscribe({
      next: (filters) => {
        this.savedFilters = filters;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des filtres sauvegardés', error);
      }
    });
  }

  loadRegions(): void {
    this.databaseService.getRegions().subscribe({
      next: (regions) => {
        this.availableRegions = regions;
      },
      error: (error) => {
        console.error('Error loading regions', error);
      }
    });
  }

  onRegionChange(regionId: number): void {
    this.selectedRegion = this.availableRegions.find(r => r.id === regionId);
    this.selectedCercle = null;
    this.selectedCommune = null;
    this.availableCommunes = [];
    this.selectedCentre = null;
    this.selectedTribunal = null;
    this.availableCentresEtatCivil = [];
    this.availableCentresDeclaration = [];
    this.availableTribunaux = [];

    this.databaseService.getCerclesByRegion(regionId).subscribe({
      next: (cercles) => {
        this.availableCercles = cercles;
      },
      error: (error) => {
        console.error('Error loading cercles', error);
      }
    });

    // Mettre à jour la navigation
    if (this.navigationMode === 'location') {
      const path = `/Archives/${this.getSelectedDocumentType()}/${this.selectedRegion.nom}/`;
      this.navigateToPath(path);
    }
  }

  onCercleChange(cercleId: number): void {
    this.selectedCercle = this.availableCercles.find(c => c.id === cercleId);
    this.selectedCommune = null;
    this.selectedCentre = null;
    this.selectedTribunal = null;
    this.availableCentresEtatCivil = [];
    this.availableCentresDeclaration = [];
    this.availableTribunaux = [];

    this.databaseService.getCommunesByCercle(cercleId).subscribe({
      next: (communes) => {
        this.availableCommunes = communes;
      },
      error: (error) => {
        console.error('Error loading communes', error);
      }
    });

    // Mettre à jour la navigation
    if (this.navigationMode === 'location' && this.selectedRegion) {
      const path = `/Archives/${this.getSelectedDocumentType()}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/`;
      this.navigateToPath(path);
    }
  }

  onCommuneChange(communeId: number): void {
    this.selectedCommune = this.availableCommunes.find(c => c.id === communeId);
    this.selectedCentre = null;
    this.selectedTribunal = null;

    // Charger les centres d'état civil pour cette commune
    this.databaseService.getCentresEtatCivilByCommune(communeId).subscribe({
      next: (centres) => {
        this.availableCentresEtatCivil = centres;
      },
      error: (error) => {
        console.error('Error loading centres d\'état civil', error);
      }
    });

    // Charger les centres de déclaration pour cette commune
    this.databaseService.getCentresDeclarationByCommune(communeId).subscribe({
      next: (centres) => {
        this.availableCentresDeclaration = centres;
      },
      error: (error) => {
        console.error('Error loading centres de déclaration', error);
      }
    });

    // Charger les tribunaux pour cette commune
    this.databaseService.getTribunauxByCommune(communeId).subscribe({
      next: (tribunaux) => {
        this.availableTribunaux = tribunaux;
      },
      error: (error) => {
        console.error('Error loading tribunaux', error);
      }
    });

    // Mettre à jour la navigation
    if (this.navigationMode === 'location' && this.selectedRegion && this.selectedCercle) {
      const path = `/Archives/${this.getSelectedDocumentType()}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/${this.selectedCommune.nom}/`;
      this.navigateToPath(path);
    }
  }

  onCentreChange(centreId: number, type: 'etatCivil' | 'declaration'): void {
    if (type === 'etatCivil') {
      this.selectedCentre = this.availableCentresEtatCivil.find(c => c.id === centreId);
    } else {
      this.selectedCentre = this.availableCentresDeclaration.find(c => c.id === centreId);
    }

    // Mettre à jour la navigation
    if (this.navigationMode === 'location' && this.selectedRegion && this.selectedCercle && this.selectedCommune) {
      const institutionType = type === 'etatCivil' ? 'Centre d\'état civil' : 'Centre de déclaration';
      const path = `/Archives/${this.getSelectedDocumentType()}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/${this.selectedCommune.nom}/${institutionType}/${this.selectedCentre.nom}/`;
      this.navigateToPath(path);
    }
  }

  onTribunalChange(tribunalId: number): void {
    this.selectedTribunal = this.availableTribunaux.find(t => t.id === tribunalId);

    // Mettre à jour la navigation
    if (this.navigationMode === 'location' && this.selectedRegion && this.selectedCercle && this.selectedCommune) {
      const path = `/Archives/${this.getSelectedDocumentType()}/${this.selectedRegion.nom}/${this.selectedCercle.nom}/${this.selectedCommune.nom}/Tribunal/${this.selectedTribunal.nom}/`;
      this.navigateToPath(path);
    }
  }

  getSelectedDocumentType(): string {
    // Extraire le type de document du chemin actuel
    const pathParts = this.currentPath.split('/').filter(part => part !== '');
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return '';
  }

  loadFolderContent(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Nettoyer le chemin actuel avant de charger les dossiers
    const cleanedPath = this.cleanupPath(this.currentPath);
    this.currentPath = cleanedPath;

    // Analyser le chemin pour déterminer quels éléments doivent être chargés
    const pathParts = cleanedPath.split('/').filter(part => part !== '');

    // Déterminer si nous sommes au dernier niveau (pour le tri par date)
    let isLastLevel = false;
    if (this.navigationMode === 'date' && pathParts.length === 5) {
      // Pour le tri par date, le dernier niveau est: /Archives/Type/Année/Mois/Jour/
      isLastLevel = true;
    } else if (this.navigationMode === 'location' && pathParts.length >= 7) {
      // Pour le tri par lieu, le dernier niveau est après le centre spécifique
      isLastLevel = true;
    }

    // Si nous sommes à la racine
    if (pathParts.length <= 1) {
      // Afficher les types de documents (racine)
      this.documentService.getRootFolders().subscribe({
        next: (folders) => {
          this.currentFolders = folders;
          this.currentDocuments = [];
          this.isLoading = false;
          this.isAtLastLevel = isLastLevel;
        },
        error: (error) => {
          console.error('Error loading root folders', error);
          this.errorMessage = `Erreur lors du chargement des dossiers: ${error.message}`;
          this.isLoading = false;
        }
      });
      return;
    }

    // Récupérer le type de document (premier élément après "Archives")
    const documentType = pathParts[1];

    if (this.navigationMode === 'date') {
      // Navigation par date
      if (pathParts.length === 2) {
        // Niveau des années
        this.loadYearFolders(documentType);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 3) {
        // Niveau des mois
        this.loadMonthFolders(`/Archives/${documentType}/${pathParts[2]}/`);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 4) {
        // Niveau des jours
        this.loadDayFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/`);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 5) {
        // Niveau des documents pour un jour spécifique
        this.loadDocumentsByPath(cleanedPath);
        this.isAtLastLevel = true;
      }
    } else {
      // Navigation par lieu
      if (pathParts.length === 2) {
        // Niveau des régions
        this.loadRegionFolders(documentType);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 3) {
        // Niveau des cercles pour une région
        this.loadCircleFolders(`/Archives/${documentType}/${pathParts[2]}/`);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 4) {
        // Niveau des communes pour un cercle
        this.loadCommuneFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/`);
        this.isAtLastLevel = false;
      } else if (pathParts.length === 5) {
        // Niveau des centres pour une commune
        this.loadCentreFolders(`/Archives/${documentType}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/`);
        this.isAtLastLevel = false;
      } else if (pathParts.length >= 6) {
        // Niveau des documents pour un centre spécifique
        this.loadDocumentsByPath(cleanedPath);
        this.isAtLastLevel = true;
      }
    }
  }

  // Méthodes spécifiques pour charger les différents niveaux de dossiers
  loadYearFolders(documentType: string): void {
    this.documentService.getYearFolders(documentType).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading year folders', error);
        this.errorMessage = `Erreur lors du chargement des années: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadMonthFolders(yearPath: string): void {
    this.documentService.getMonthFolders(yearPath).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading month folders', error);
        this.errorMessage = `Erreur lors du chargement des mois: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadDayFolders(monthPath: string): void {
    this.documentService.getDayFolders(monthPath).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading day folders', error);
        this.errorMessage = `Erreur lors du chargement des jours: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadRegionFolders(documentType: string): void {
    this.documentService.getRegionFolders(documentType).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;

        // Mettre à jour les sélections si nécessaire
        this.updateLocationSelections();
      },
      error: (error) => {
        console.error('Error loading region folders', error);
        this.errorMessage = `Erreur lors du chargement des régions: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadCircleFolders(regionPath: string): void {
    this.documentService.getCircleFolders(regionPath).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;

        // Mettre à jour les sélections si nécessaire
        this.updateLocationSelections();
      },
      error: (error) => {
        console.error('Error loading circle folders', error);
        this.errorMessage = `Erreur lors du chargement des cercles: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadCommuneFolders(circlePath: string): void {
    this.documentService.getCommuneFolders(circlePath).subscribe({
      next: (folders) => {
        this.currentFolders = folders;
        this.currentDocuments = [];
        this.isLoading = false;

        // Mettre à jour les sélections si nécessaire
        this.updateLocationSelections();
      },
      error: (error) => {
        console.error('Error loading commune folders', error);
        this.errorMessage = `Erreur lors du chargement des communes: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadCentreFolders(communePath: string): void {
    // Détermine quel type de centre ajouter au chemin
    const centreType = 'Centre d\'état civil';

    this.documentService.getCivilStatusCenterFolders(`${communePath}${centreType}/`).subscribe({
      next: (folders) => {
        // Ajouter les centres de déclaration et tribunaux
        this.documentService.getDeclarationCenterFolders(`${communePath}Centre de déclaration/`).subscribe(declarationCenters => {
          this.documentService.getTribunalFolders(`${communePath}Tribunal/`).subscribe(tribunals => {
            // Combiner tous les dossiers
            const allFolders: Folder[] = [
              // Dossier pour les centres d'état civil
              {
                name: 'Centre d\'état civil',
                path: `${communePath}Centre d\'état civil/`,
                type: 'center',
                iconClass: 'bi-house-door',
                colorClass: 'text-teal'
              },
              // Dossier pour les centres de déclaration
              {
                name: 'Centre de déclaration',
                path: `${communePath}Centre de déclaration/`,
                type: 'center',
                iconClass: 'bi-building-check',
                colorClass: 'text-info'
              },
              // Dossier pour les tribunaux
              {
                name: 'Tribunal',
                path: `${communePath}Tribunal/`,
                type: 'center',
                iconClass: 'bi-bank',
                colorClass: 'text-secondary'
              }
            ];

            this.currentFolders = allFolders;
            this.currentDocuments = [];
            this.isLoading = false;

            // Mettre à jour les sélections si nécessaire
            this.updateLocationSelections();
          });
        });
      },
      error: (error) => {
        console.error('Error loading centre folders', error);
        this.errorMessage = `Erreur lors du chargement des centres: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadDocumentsByPath(path: string): void {
    this.documentService.getDocumentsByPath(path).subscribe({
      next: (documents) => {
        this.currentFolders = [];
        this.currentDocuments = documents;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading documents by path', error);
        this.errorMessage = `Erreur lors du chargement des documents: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  // Mise à jour des sélections géographiques en fonction du chemin
  updateLocationSelections(): void {
    // Si nous sommes en mode de navigation par lieu
    if (this.navigationMode === 'location') {
      const pathParts = this.currentPath.split('/').filter(part => part !== '');

      // Niveau des régions
      if (pathParts.length >= 3 && pathParts[2]) {
        const regionName = pathParts[2];
        const region = this.availableRegions.find(r => r.nom === regionName);
        if (region && (!this.selectedRegion || this.selectedRegion.id !== region.id)) {
          this.selectedRegion = region;
          this.onRegionChange(region.id);
        }
      }

      // Niveau des cercles
      if (pathParts.length >= 4 && pathParts[3]) {
        const cercleName = pathParts[3];
        setTimeout(() => {
          const cercle = this.availableCercles.find(c => c.nom === cercleName);
          if (cercle && (!this.selectedCercle || this.selectedCercle.id !== cercle.id)) {
            this.selectedCercle = cercle;
            this.onCercleChange(cercle.id);
          }
        }, 500); // Délai pour s'assurer que les cercles sont chargés
      }

      // Niveau des communes
      if (pathParts.length >= 5 && pathParts[4]) {
        const communeName = pathParts[4];
        setTimeout(() => {
          const commune = this.availableCommunes.find(c => c.nom === communeName);
          if (commune && (!this.selectedCommune || this.selectedCommune.id !== commune.id)) {
            this.selectedCommune = commune;
            this.onCommuneChange(commune.id);
          }
        }, 1000); // Délai pour s'assurer que les communes sont chargées
      }

      // Niveau des centres
      if (pathParts.length >= 7 && pathParts[6]) {
        const centreName = pathParts[6];
        const centreType = pathParts[5];

        setTimeout(() => {
          if (centreType === 'Centre d\'état civil') {
            const centre = this.availableCentresEtatCivil.find(c => c.nom === centreName);
            if (centre && (!this.selectedCentre || this.selectedCentre.id !== centre.id)) {
              this.selectedCentre = centre;
            }
          } else if (centreType === 'Centre de déclaration') {
            const centre = this.availableCentresDeclaration.find(c => c.nom === centreName);
            if (centre && (!this.selectedCentre || this.selectedCentre.id !== centre.id)) {
              this.selectedCentre = centre;
            }
          } else if (centreType === 'Tribunal') {
            const tribunal = this.availableTribunaux.find(t => t.nom === centreName);
            if (tribunal && (!this.selectedTribunal || this.selectedTribunal.id !== tribunal.id)) {
              this.selectedTribunal = tribunal;
            }
          }
        }, 1500); // Délai pour s'assurer que les centres sont chargés
      }
    }
  }

  // Méthode pour nettoyer les chemins anormaux
  private cleanupPath(path: string): string {
    // Correction des années anormales (20241, 202411, etc.)
    return path.replace(/\/(\d{4})\d+\//g, '/$1/');
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

  navigateToPath(path: string): void {
    this.currentPath = path;
    this.updateBreadcrumb();
    this.updateUrlParams();
    this.updateFilterVisibility(); // Mise à jour des filtres
    this.addToHistory(this.currentPath);
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

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
    this.saveUserPreferences();
  }

  setNavigationMode(mode: 'date' | 'location'): void {
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
    this.updateFilterVisibility(); // Mettre à jour la visibilité des filtres

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

  toggleFilterPanel(): void {
    this.isFilterExpanded = !this.isFilterExpanded;

    // Mise à jour de l'URL
    this.updateUrlParams();
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

      // Si nous sommes en mode filtres avancés, fermer le panneau
      if (this.isFilterExpanded) {
        this.isFilterExpanded = false;
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

  onSearch(term: string): void {
    this.searchTerm = term;

    if (term) {
      // Activer le mode recherche
      this.isSearchMode = true;

      // Mettre à jour l'URL
      this.updateUrlParams();

      // Ajouter à l'historique de navigation
      this.addToHistory(this.currentPath);

      // Effectuer la recherche
      const searchFilter: FilterCriteria = {
        ...(this.currentFilter || {}),
        searchTerm: term
      };

      this.documentService.getDocuments(searchFilter).subscribe({
        next: (documents) => {
          this.currentFolders = [];
          this.currentDocuments = documents;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error searching documents', error);
          this.errorMessage = `Erreur lors de la recherche: ${error.message}`;
          this.isLoading = false;
        }
      });
    } else {
      // Si le terme est vide, revenir en mode navigation
      this.isSearchMode = false;
      this.loadFolderContent();
    }
  }

  saveCurrentFilter(): void {
    // Ouvrir la boîte de dialogue de sauvegarde
    const dialogRef = this.dialog.open(SaveFilterDialogComponent, {
      width: '400px',
      data: {
        filter: {
          criteria: this.currentFilter || {}
        },
        existingFilters: this.savedFilters
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.filterService.saveFilter(
          { criteria: this.currentFilter || {} },
          result.name,
          result.description
        ).subscribe({
          next: (savedFilter) => {
            this.savedFilters = [...this.savedFilters.filter(f => f.id !== savedFilter.id), savedFilter];
            this.isLoading = false;
            // Afficher un message de confirmation
            this.successMessage = `Filtre "${result.name}" sauvegardé avec succès`;
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Erreur lors de la sauvegarde du filtre', error);
            this.isLoading = false;
            this.errorMessage = `Erreur lors de la sauvegarde du filtre: ${error.message}`;
            setTimeout(() => this.errorMessage = '', 3000);
          }
        });
      }
    });
  }

  resetFilters(): void {
    this.filterService.resetFilter();
    // Fermer le panneau des filtres avancés
    this.isFilterExpanded = false;
  }

  loadFilter(filterId: string): void {
    this.filterService.loadFilter(filterId).subscribe({
      next: (filter) => {
        // Appliquer les filtres
        this.applyFilters(filter.criteria);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du filtre', error);
        this.errorMessage = `Erreur lors du chargement du filtre: ${error.message}`;
      }
    });
  }

  setDefaultFilter(filterId: string): void {
    this.filterService.setDefaultFilter(filterId).subscribe({
      next: () => {
        // Mettre à jour les filtres sauvegardés
        this.loadSavedFilters();
      },
      error: (error) => {
        console.error('Erreur lors de la définition du filtre par défaut', error);
        this.errorMessage = `Erreur lors de la définition du filtre par défaut: ${error.message}`;
      }
    });
  }

  deleteFilter(filterId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer ce filtre ?')) {
      this.filterService.deleteFilter(filterId).subscribe({
        next: () => {
          // Mettre à jour les filtres sauvegardés
          this.loadSavedFilters();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du filtre', error);
          this.errorMessage = `Erreur lors de la suppression du filtre: ${error.message}`;
        }
      });
    }
  }
}