import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent {
  @Output() filtersChanged = new EventEmitter<any>();
  
  searchTerm: string = '';
  filters = {
    documentType: '',
    region: '',
    startDate: '',
    endDate: '',
  };

  applyFilters(): void {
    const appliedFilters = {
      searchTerm: this.searchTerm,
      ...this.filters
    };
    this.filtersChanged.emit(appliedFilters);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = {
      documentType: '',
      region: '',
      startDate: '',
      endDate: '',
    };
    this.applyFilters();
  }
}