import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subject, of, switchMap } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { FilterService } from '../../services/filter.service';
import { SearchSuggestion } from '../../models/filter.model';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Output() search = new EventEmitter<string>();
  
  searchControl = new FormControl('');
  suggestions$!: Observable<SearchSuggestion[]>;
  isLoading = false;
  showSuggestions = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(private filterService: FilterService) { }

  ngOnInit(): void {
    // Configurer l'auto-suggestion
    this.suggestions$ = this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(200), // Réduire le délai pour une expérience plus réactive
      distinctUntilChanged(),
      filter(term => !!term && term.length >= 2),
      tap(() => this.isLoading = true),
      switchMap(term => this.filterService.getSearchSuggestions(term || '').pipe(
        catchError(() => of([])),
        tap(() => this.isLoading = false)
      ))
    );
    
    // Également émettre la recherche après un délai
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(700), // Délai suffisant pour que l'utilisateur finisse de taper
      distinctUntilChanged()
    ).subscribe(term => {
      if (term && term.length >= 3) {
        this.search.emit(term);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFocus(): void {
    this.showSuggestions = true;
  }

  onBlur(): void {
    // Retarder la fermeture des suggestions pour permettre le clic
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    // Mettre à jour le champ de recherche avec la valeur de la suggestion
    this.searchControl.setValue(suggestion.value);
    
    // Fermer les suggestions
    this.showSuggestions = false;
    
    // Émettre la recherche
    this.search.emit(suggestion.value);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.search.emit('');
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.search.emit(this.searchControl.value || '');
  }
}