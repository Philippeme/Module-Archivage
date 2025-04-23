import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Document, DocumentAction } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-document-history',
  templateUrl: './document-history.component.html',
  styleUrls: ['./document-history.component.scss']
})
export class DocumentHistoryComponent implements OnChanges {
  @Input() document: Document | null = null;
  
  actions: DocumentAction[] = [];
  isLoading = false;
  errorMessage = '';
  
  constructor(private documentService: DocumentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      this.loadActionHistory();
    }
  }

  loadActionHistory(): void {
    if (!this.document) return;
    
    this.isLoading = true;
    this.documentService.getDocumentActionHistory(this.document.id).subscribe({
      next: (actions) => {
        this.actions = actions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading action history', error);
        this.errorMessage = 'Erreur lors du chargement de l\'historique des actions.';
        this.isLoading = false;
      }
    });
  }
  
  getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'Consultation': return 'bi-eye';
      case 'Téléchargement': return 'bi-download';
      case 'Partage': return 'bi-share';
      case 'Création de version': return 'bi-file-earmark-plus';
      case 'Ajout de commentaire': return 'bi-chat-left-text';
      default: return 'bi-activity';
    }
  }
  
  getActionColor(actionType: string): string {
    switch (actionType) {
      case 'Consultation': return 'text-info';
      case 'Téléchargement': return 'text-primary';
      case 'Partage': return 'text-success';
      case 'Création de version': return 'text-warning';
      case 'Ajout de commentaire': return 'text-purple';
      default: return 'text-secondary';
    }
  }
}