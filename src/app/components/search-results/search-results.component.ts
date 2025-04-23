import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Document } from '../../models/document.model';
import { FilterCriteria } from '../../models/filter.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnChanges {
  @Input() searchTerm = '';
  @Input() filter: FilterCriteria | null = null;
  
  documents: Document[] = [];
  isLoading = false;
  error = '';
  resultsCount = 0;
  
  groupedResults: {[key: string]: Document[]} = {};
  groupBy: 'none' | 'type' | 'institution' | 'date' = 'none';
  
  constructor(private documentService: DocumentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['searchTerm'] || changes['filter']) && (this.searchTerm || this.filter)) {
      this.performSearch();
    }
  }

  performSearch(): void {
    this.isLoading = true;
    
    // Combiner le terme de recherche avec les filtres existants
    const combinedFilter: FilterCriteria = {
      ...(this.filter || {}),
      searchTerm: this.searchTerm || this.filter?.searchTerm
    };
    
    this.documentService.getDocuments(combinedFilter).subscribe({
      next: (results) => {
        this.documents = results;
        this.resultsCount = results.length;
        this.isLoading = false;
        
        // Regrouper les résultats si nécessaire
        this.updateGroupedResults();
      },
      error: (error) => {
        this.error = `Erreur lors de la recherche: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  setGroupBy(groupBy: 'none' | 'type' | 'institution' | 'date'): void {
    this.groupBy = groupBy;
    this.updateGroupedResults();
  }

  private updateGroupedResults(): void {
    if (this.groupBy === 'none') {
      this.groupedResults = { 'Tous les résultats': [...this.documents] };
      return;
    }
    
    this.groupedResults = {};
    
    switch (this.groupBy) {
      case 'type':
        // Regrouper par type de document
        this.documents.forEach(doc => {
          const key = doc.type;
          if (!this.groupedResults[key]) {
            this.groupedResults[key] = [];
          }
          this.groupedResults[key].push(doc);
        });
        break;
        
      case 'institution':
        // Regrouper par institution source
        this.documents.forEach(doc => {
          const key = doc.sourceInstitution;
          if (!this.groupedResults[key]) {
            this.groupedResults[key] = [];
          }
          this.groupedResults[key].push(doc);
        });
        break;
        
      case 'date':
        // Regrouper par année de création
        this.documents.forEach(doc => {
          const year = doc.creationDate.getFullYear();
          const key = `${year}`;
          if (!this.groupedResults[key]) {
            this.groupedResults[key] = [];
          }
          this.groupedResults[key].push(doc);
        });
        
        // Trier les clés (années) en ordre décroissant
        const sortedGroups: {[key: string]: Document[]} = {};
        Object.keys(this.groupedResults)
          .sort((a, b) => parseInt(b) - parseInt(a))
          .forEach(key => {
            sortedGroups[key] = this.groupedResults[key];
          });
        this.groupedResults = sortedGroups;
        break;
    }
  }
}