import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FilterCriteria, SavedFilter } from '../../models/filter.model';
import { DocumentType } from '../../models/document.model';
import { FilterService } from '../../services/filter.service';
import { SaveFilterDialogComponent } from '../save-filter-dialog/save-filter-dialog.component';

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
        { value: 'OR', label: 'N\'importe quel critère (OU)' }
    ];
    savedFilters: SavedFilter[] = [];
    isLoading = false;

    regions = [
        'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'District de Bamako'
    ];

    tribunals = [
        'Tribunal de Kayes', 'Tribunal de Bamako', 'Tribunal de Sikasso'
    ];

    declarationCenters = [
        'Centre de Déclaration de Kayes',
        'Centre de Déclaration de Bamako',
        'Centre de Déclaration de Sikasso'
    ];

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

    isFilterExpanded = false;

    private destroy$ = new Subject<void>();

    constructor(
        private formBuilder: FormBuilder,
        private filterService: FilterService,
        private dialog: MatDialog
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
            circle: [null],
            commune: [null],
            center: [null],
            tribunal: [null],
            declarationCenter: [null],
            startDate: [null],
            endDate: [null],
            concernedPerson: [''],
            sourceInstitution: [''],
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
            },
            error: (error) => {
                console.error('Erreur lors du chargement du filtre', error);
                this.isLoading = false;
            }
        });
    }

    setDefaultFilter(filterId: string): void {
        this.filterService.setDefaultFilter(filterId).subscribe({
            next: () => {
                // Mettre à jour l'interface pour refléter le changement
                this.savedFilters = this.savedFilters.map(f => ({
                    ...f,
                    isDefault: f.id === filterId
                }));
            },
            error: (error) => {
                console.error('Erreur lors de la définition du filtre par défaut', error);
            }
        });
    }

    deleteFilter(filterId: string, event: Event): void {
        event.stopPropagation();

        if (confirm('Êtes-vous sûr de vouloir supprimer ce filtre?')) {
            this.filterService.deleteFilter(filterId).subscribe({
                next: () => {
                    this.savedFilters = this.savedFilters.filter(f => f.id !== filterId);
                },
                error: (error) => {
                    console.error('Erreur lors de la suppression du filtre', error);
                }
            });
        }
    }

    openSaveFilterDialog(): void {
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

    toggleFilterPanel(): void {
        this.isFilterExpanded = !this.isFilterExpanded;
    }
}