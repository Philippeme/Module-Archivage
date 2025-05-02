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
  @Output() saveFilter = new EventEmitter<void>();
  @Output() applyFilters = new EventEmitter<FilterCriteria>();

  filterForm: FormGroup;
  documentTypes = Object.values(DocumentType);
  logicalOperators = [
    { value: 'AND', label: 'Tous les critères (ET)' },
    { value: 'OR', label: 'Au moins un critère (OU)' }
  ];
  savedFilters: SavedFilter[] = [];
  isLoading = false;
  saveSuccess = false;
  saveMessage = '';

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

        // Appliquer les changements de l'opérateur logique
        if (filter.criteria.logicalOperator) {
          this.updateFormValidations(filter.criteria.logicalOperator);
        }
      }
    });

    // Observer les changements de l'opérateur logique
    this.filterForm.get('logicalOperator')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateFormValidations(value);
    });

    // Observer les changements du formulaire et appliquer les filtres
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(values => {
      this.filtersChanged.emit(this.prepareFilters());
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

  // Nouvelle méthode pour appliquer directement les filtres aux documents
  applyDirectlyFiltersToDocs(): void {
    const criteria = this.prepareFilters();
    this.applyFilters.emit(criteria);
    this.showSuccessMessage('Filtres appliqués avec succès');
  }

  // Méthode pour préparer les filtres
  prepareFilters(): FilterCriteria {
    const formValues = this.filterForm.value;
    const logicalOperator = formValues.logicalOperator;

    // Ne prendre que les valeurs non vides
    const criteria: FilterCriteria = Object.entries(formValues).reduce((acc, [key, value]) => {
      if (value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
        if (key in acc || Object.keys(new Object() as FilterCriteria).includes(key)) {
          acc[key as keyof FilterCriteria] = value as any;
        }
      }
      return acc;
    }, {} as FilterCriteria);

    // S'assurer que l'opérateur logique est toujours inclus, même s'il s'agit de la valeur par défaut
    criteria.logicalOperator = logicalOperator;

    return criteria;
  }

  // Méthode pour mettre à jour les validations du formulaire en fonction de l'opérateur logique
  updateFormValidations(operatorValue: 'AND' | 'OR'): void {
    // Obtenir tous les contrôles sauf l'opérateur logique
    const controls = Object.keys(this.filterForm.controls).filter(key => key !== 'logicalOperator');

    if (operatorValue === 'AND') {
      // Pour AND, tous les champs doivent être valides pour que le filtre soit appliqué
      // Les validations sont plus strictes

      // Renforcer les validations pour les dates
      if (this.filterForm.get('startDate')?.value && !this.filterForm.get('endDate')?.value) {
        // Si une date de début est spécifiée, la date de fin devrait également être spécifiée
        this.filterForm.get('endDate')?.setErrors({ required: true });
      }

      // Vérifier que les sélections géographiques sont cohérentes
      if (this.selectedRegion) {
        // Si une région est sélectionnée, les autres sélections doivent être cohérentes
        if (this.filterForm.get('centreEtatCivil')?.value && !this.selectedCommune) {
          this.filterForm.get('centreEtatCivil')?.setErrors({ invalidHierarchy: true });
        }

        if (this.filterForm.get('centreDeclaration')?.value && !this.selectedCommune) {
          this.filterForm.get('centreDeclaration')?.setErrors({ invalidHierarchy: true });
        }

        if (this.filterForm.get('tribunal')?.value && !this.selectedCommune) {
          this.filterForm.get('tribunal')?.setErrors({ invalidHierarchy: true });
        }
      }

      // Si une personne concernée est spécifiée, le type de document devrait également être spécifié
      if (this.filterForm.get('concernedPerson')?.value && !this.filterForm.get('documentType')?.value) {
        this.filterForm.get('documentType')?.setErrors({ requiredWithPerson: true });
      }
    } else {
      // Pour OR, au moins un champ doit être valide pour que le filtre soit appliqué
      // Les validations sont plus souples

      // Réinitialiser les erreurs ajoutées pour l'opérateur AND
      this.filterForm.get('endDate')?.setErrors(null);
      this.filterForm.get('centreEtatCivil')?.setErrors(null);
      this.filterForm.get('centreDeclaration')?.setErrors(null);
      this.filterForm.get('tribunal')?.setErrors(null);
      this.filterForm.get('documentType')?.setErrors(null);

      // Vérifier qu'au moins un champ est rempli
      const hasValue = controls.some(controlName => {
        const control = this.filterForm.get(controlName);
        return control && control.value !== null && control.value !== '' &&
          (Array.isArray(control.value) ? control.value.length > 0 : true);
      });

      // Si aucun champ n'est rempli, afficher une erreur générale
      if (!hasValue) {
        // Plutôt que de définir des erreurs par champ, nous pourrions afficher un message
        // dans le composant parent indiquant qu'au moins un critère doit être spécifié
        // Mais pour l'instant, nous ne faisons rien car tous les champs sont optionnels
      }
    }

    // Mettre à jour la validité du formulaire
    this.filterForm.updateValueAndValidity({ emitEvent: false });
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

  doApplyFilters(): void {
    const criteria = this.prepareFilters();

    // Mettre à jour le service de filtres et émettre le changement
    this.filterService.updateFilter(criteria);
    this.filtersChanged.emit(criteria);
  }

  doSaveFilter(): void {
    const criteria = this.prepareFilters();

    // Ouvrir la boîte de dialogue de sauvegarde
    const dialogRef = this.dialog.open(SaveFilterDialogComponent, {
      width: '400px',
      data: {
        filter: {
          criteria: criteria
        },
        existingFilters: this.savedFilters
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.filterService.saveFilter(
          { 
            criteria: criteria,
            isDefault: result.isDefault || false  // Intégré dans l'objet filtre
          },
          result.name,
          result.description
        ).subscribe({
          next: (savedFilter) => {
            this.savedFilters = [...this.savedFilters.filter(f => f.id !== savedFilter.id), savedFilter];
            this.isLoading = false;

            // Mettre à jour le filtre courant
            this.filterService.updateFilter(criteria);

            // Appliquer directement les filtres
            this.filtersChanged.emit(criteria);
            this.applyFilters.emit(criteria);

            // Afficher un message de succès
            this.showSuccessMessage(`Filtre "${result.name}" sauvegardé avec succès`);

            // Émettre un événement pour indiquer que le filtre a été sauvegardé
            this.saveFilter.emit();
          },
          error: (error) => {
            console.error('Erreur lors de la sauvegarde du filtre', error);
            this.isLoading = false;
            this.showErrorMessage(`Erreur lors de la sauvegarde du filtre: ${error.message}`);
          }
        });
      }
    });
  }

  resetFilters(): void {
    // Réinitialiser complètement le formulaire
    this.filterForm.reset();

    // Réappliquer uniquement les valeurs par défaut nécessaires
    this.filterForm.patchValue({
      logicalOperator: 'AND',
      excludeDeleted: true,
      sortBy: 'creationDate',
      sortDirection: 'desc',
      documentType: null,
      region: null,
      cercle: null,
      commune: null,
      centreEtatCivil: null,
      centreDeclaration: null,
      tribunal: null,
      startDate: null,
      endDate: null,
      concernedPerson: '',
      sourceInstitution: null,
      creator: '',
      lastModifier: '',
      searchTerm: ''
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

    // Appliquer les filtres réinitialisés
    this.doApplyFilters();
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

  onSaveFilter(): void {
    this.doSaveFilter();
  }

  loadFilter(filterId: string): void {
    this.isLoading = true;
    this.filterService.loadFilter(filterId).subscribe({
      next: (filter) => {
        this.filterForm.patchValue(filter.criteria);

        // Mettre à jour les validations en fonction de l'opérateur logique
        if (filter.criteria.logicalOperator) {
          this.updateFormValidations(filter.criteria.logicalOperator as 'AND' | 'OR');
        }

        this.doApplyFilters();
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

    this.doApplyFilters();
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

    this.doApplyFilters();
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

    this.doApplyFilters();
  }

  onCentreEtatCivilChange(centreId: number): void {
    // Mettre à jour le formulaire
    const centre = this.centresEtatCivil.find(c => c.id === centreId);
    if (centre) {
      this.filterForm.patchValue({ centreEtatCivil: centre.nom });
    }

    this.doApplyFilters();
  }

  onCentreDeclarationChange(centreId: number): void {
    // Mettre à jour le formulaire
    const centre = this.centresDeclaration.find(c => c.id === centreId);
    if (centre) {
      this.filterForm.patchValue({ centreDeclaration: centre.nom });
    }

    this.doApplyFilters();
  }

  onTribunalChange(tribunalId: number): void {
    // Mettre à jour le formulaire
    const tribunal = this.tribunaux.find(t => t.id === tribunalId);
    if (tribunal) {
      this.filterForm.patchValue({ tribunal: tribunal.nom });
    }

    this.doApplyFilters();
  }

  private showSuccessMessage(message: string): void {
    this.saveSuccess = true;
    this.saveMessage = message;
    setTimeout(() => {
      this.saveSuccess = false;
      this.saveMessage = '';
    }, 3000);
  }

  private showErrorMessage(message: string): void {
    this.saveSuccess = false;
    this.saveMessage = message;
    setTimeout(() => {
      this.saveMessage = '';
    }, 3000);
  }
}