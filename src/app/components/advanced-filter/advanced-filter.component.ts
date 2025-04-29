import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FilterCriteria, SavedFilter } from '../../models/filter.model';
import { DocumentType } from '../../models/document.model';
import { FilterService } from '../../services/filter.service';
import { SaveFilterDialogComponent } from '../save-filter-dialog/save-filter-dialog.component';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-advanced-filter',
  templateUrl: './advanced-filter.component.html',
  styleUrls: ['./advanced-filter.component.scss']
})
export class AdvancedFilterComponent implements OnInit, OnDestroy {
  @Output() filtersChanged = new EventEmitter<FilterCriteria>();

  filterForm: FormGroup;
  documentTypes = Object.values(DocumentType);
  logicalOperators = [
    { value: 'AND', label: 'Tous les critères (ET)' },
    { value: 'OR', label: 'Au moins un critère (OU)' }
  ];
  savedFilters: SavedFilter[] = [];
  isLoading = false;

  // Données pour les filtres géographiques
  regions: any[] = [];
  cercles: any[] = [];
  communes: any[] = [];
  centresEtatCivil: any[] = [];
  centresDeclaration: any[] = [];
  tribunaux: any[] = [];

  selectedRegion: any = null;
  selectedCercle: any = null;
  selectedCommune: any = null;

  sortOptions = [
    { value: 'creationDate', label: 'Date de création' },
    { value: 'lastModificationDate', label: 'Date de modification' },
    { value: 'originalName', label: 'Nom du document' },
    { value: 'sourceInstitution', label: 'Institution source' },
    { value: 'type', label: 'Type de document' }
  ];

  sortDirections = [
    { value: 'asc', label: 'Croissant' },
    { value: 'desc', label: 'Décroissant' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private filterService: FilterService,
    private dialog: MatDialog,
    private databaseService: DatabaseService
  ) {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    // Observer les changements du filtre courant
    this.filterService.currentFilter$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filter => {
      if (filter) {
        this.filterForm.patchValue(filter.criteria);
      }
    });

    // Observer les changements du formulaire et appliquer les filtres
    this.filterForm.valueChanges.pipe(
      debounceTime(300), // Attendre que l'utilisateur ait fini de taper
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(values => {
      this.applyFilters();
    });

    // Charger les filtres sauvegardés
    this.loadSavedFilters();

    // Charger les données géographiques
    this.loadRegions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createFilterForm(): FormGroup {
    return this.formBuilder.group({
      searchTerm: [''],
      documentType: [null],
      region: [null],
      cercle: [null],
      commune: [null],
      centreEtatCivil: [null],
      centreDeclaration: [null],
      tribunal: [null],
      startDate: [null],
      endDate: [null],
      concernedPerson: [''],
      sourceInstitution: [null],
      creator: [''],
      lastModifier: [''],
      logicalOperator: ['AND'],
      excludeDeleted: [true],
      sortBy: ['creationDate'],
      sortDirection: ['desc']
    });
  }

  applyFilters(): void {
    const formValues = this.filterForm.value;

    // Ne prendre que les valeurs non vides
    const criteria: FilterCriteria = Object.entries(formValues).reduce((acc, [key, value]) => {
      if (value !== null && value !== '' && Array.isArray(value) ? value.length > 0 : true) {
        if (key in acc || Object.keys(new Object() as FilterCriteria).includes(key)) {
          acc[key as keyof FilterCriteria] = value as any;
        }
      }
      return acc;
    }, {} as FilterCriteria);

    // Mettre à jour le service de filtres et émettre le changement
    this.filterService.updateFilter(criteria);
    this.filtersChanged.emit(criteria);
  }

  resetFilters(): void {
    this.filterService.resetFilter();
    this.filterForm.reset({
      logicalOperator: 'AND',
      excludeDeleted: true,
      sortBy: 'creationDate',
      sortDirection: 'desc'
    });
    
    // Réinitialiser les sélections géographiques
    this.selectedRegion = null;
    this.selectedCercle = null;
    this.selectedCommune = null;
    this.cercles = [];
    this.communes = [];
    this.centresEtatCivil = [];
    this.centresDeclaration = [];
    this.tribunaux = [];
    
    this.applyFilters();
  }

  loadSavedFilters(): void {
    this.isLoading = true;
    this.filterService.getSavedFilters().subscribe({
      next: (filters) => {
        this.savedFilters = filters;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des filtres sauvegardés', error);
        this.isLoading = false;
      }
    });
  }

  loadFilter(filterId: string): void {
    this.isLoading = true;
    this.filterService.loadFilter(filterId).subscribe({
      next: (filter) => {
        this.filterForm.patchValue(filter.criteria);
        this.applyFilters();
        this.isLoading = false;
        
        // Mettre à jour les sélections géographiques
        if (filter.criteria.region) {
          const regionId = this.regions.find(r => r.nom === filter.criteria.region)?.id;
          if (regionId) {
            this.onRegionChange(regionId);
          }
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du filtre', error);
        this.isLoading = false;
      }
    });
  }

  saveFilter(): void {
    const dialogRef = this.dialog.open(SaveFilterDialogComponent, {
      width: '400px',
      data: {
        filter: {
          criteria: this.filterForm.value
        },
        existingFilters: this.savedFilters
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.filterService.saveFilter(
          { criteria: this.filterForm.value },
          result.name,
          result.description
        ).subscribe({
          next: (savedFilter) => {
            this.savedFilters = [...this.savedFilters.filter(f => f.id !== savedFilter.id), savedFilter];
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la sauvegarde du filtre', error);
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Méthodes pour les sélections géographiques
  loadRegions(): void {
    this.databaseService.getRegions().subscribe({
      next: (regions) => {
        this.regions = regions;
      },
      error: (error) => {
        console.error('Error loading regions', error);
      }
    });
  }

  onRegionChange(regionId: number): void {
    // Mettre à jour le formulaire
    const region = this.regions.find(r => r.id === regionId);
    if (region) {
      this.filterForm.patchValue({ region: region.nom });
      this.selectedRegion = region;
    }
    
    this.selectedCercle = null;
    this.selectedCommune = null;
    this.communes = [];
    this.centresEtatCivil = [];
    this.centresDeclaration = [];
    this.tribunaux = [];
    
    this.filterForm.patchValue({
      cercle: null,
      commune: null,
      centreEtatCivil: null,
      centreDeclaration: null,
      tribunal: null
    });

    if (regionId) {
      this.databaseService.getCerclesByRegion(regionId).subscribe({
        next: (cercles) => {
          this.cercles = cercles;
        },
        error: (error) => {
          console.error('Error loading cercles', error);
        }
      });
    }
    
    this.applyFilters();
  }

  onCercleChange(cercleId: number): void {
    // Mettre à jour le formulaire
    const cercle = this.cercles.find(c => c.id === cercleId);
    if (cercle) {
      this.filterForm.patchValue({ cercle: cercle.nom });
      this.selectedCercle = cercle;
    }
    
    this.selectedCommune = null;
    this.centresEtatCivil = [];
    this.centresDeclaration = [];
    this.tribunaux = [];
    
    this.filterForm.patchValue({
      commune: null,
      centreEtatCivil: null,
      centreDeclaration: null,
      tribunal: null
    });

    if (cercleId) {
      this.databaseService.getCommunesByCercle(cercleId).subscribe({
        next: (communes) => {
          this.communes = communes;
        },
        error: (error) => {
          console.error('Error loading communes', error);
        }
      });
    }
    
    this.applyFilters();
  }

  onCommuneChange(communeId: number): void {
    // Mettre à jour le formulaire
    const commune = this.communes.find(c => c.id === communeId);
    if (commune) {
      this.filterForm.patchValue({ commune: commune.nom });
      this.selectedCommune = commune;
    }
    
    this.filterForm.patchValue({
      centreEtatCivil: null,
      centreDeclaration: null,
      tribunal: null
    });

    if (communeId) {
      // Charger les centres d'état civil
      this.databaseService.getCentresEtatCivilByCommune(communeId).subscribe({
        next: (centres) => {
          this.centresEtatCivil = centres;
        },
        error: (error) => {
          console.error('Error loading centres d\'état civil', error);
        }
      });
      
      // Charger les centres de déclaration
      this.databaseService.getCentresDeclarationByCommune(communeId).subscribe({
        next: (centres) => {
          this.centresDeclaration = centres;
        },
        error: (error) => {
          console.error('Error loading centres de déclaration', error);
        }
      });
      
      // Charger les tribunaux
      this.databaseService.getTribunauxByCommune(communeId).subscribe({
        next: (tribunaux) => {
          this.tribunaux = tribunaux;
        },
        error: (error) => {
          console.error('Error loading tribunaux', error);
        }
      });
    }
    
    this.applyFilters();
  }

  onCentreEtatCivilChange(centreId: number): void {
    // Mettre à jour le formulaire
    const centre = this.centresEtatCivil.find(c => c.id === centreId);
    if (centre) {
      this.filterForm.patchValue({ centreEtatCivil: centre.nom });
    }
    
    this.applyFilters();
  }

  onCentreDeclarationChange(centreId: number): void {
    // Mettre à jour le formulaire
    const centre = this.centresDeclaration.find(c => c.id === centreId);
    if (centre) {
      this.filterForm.patchValue({ centreDeclaration: centre.nom });
    }
    
    this.applyFilters();
  }

  onTribunalChange(tribunalId: number): void {
    // Mettre à jour le formulaire
    const tribunal = this.tribunaux.find(t => t.id === tribunalId);
    if (tribunal) {
      this.filterForm.patchValue({ tribunal: tribunal.nom });
    }
    
    this.applyFilters();
  }
}