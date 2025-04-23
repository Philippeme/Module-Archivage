import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Document } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-version-comparison',
  templateUrl: './version-comparison.component.html',
  styleUrls: ['./version-comparison.component.scss']
})
export class VersionComparisonComponent implements OnChanges {
  @Input() document: Document | null = null;
  @Input() documentVersions: Document[] = [];
  @Output() close = new EventEmitter<void>();
  
  selectedVersion1: Document | null = null;
  selectedVersion2: Document | null = null;
  
  comparisonPdfUrl: SafeResourceUrl | null = null;
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private documentService: DocumentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      // Par défaut, on sélectionne la version la plus récente et la seconde plus récente si elle existe
      if (this.documentVersions.length >= 2) {
        this.selectedVersion1 = this.documentVersions[0];
        this.selectedVersion2 = this.documentVersions[1];
      } else if (this.documentVersions.length === 1) {
        this.selectedVersion1 = this.documentVersions[0];
        this.selectedVersion2 = null;
      }
    }
  }

  compareVersions(): void {
    if (!this.document || !this.selectedVersion1 || !this.selectedVersion2) {
      this.errorMessage = 'Veuillez sélectionner deux versions à comparer.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.comparisonPdfUrl = null;
    
    this.documentService.compareDocumentVersions(
      this.document.id, 
      this.selectedVersion1.version, 
      this.selectedVersion2.version
    ).subscribe({
      next: (blob) => {
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(pdfBlob);
        this.comparisonPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.isLoading = false;
        
        // Enregistrer l'action de comparaison
        this.documentService.recordDocumentAction(
          this.document!.id, 
          'VIEW' as any, 
          `Comparaison des versions ${this.selectedVersion1?.version} et ${this.selectedVersion2?.version}`
        ).subscribe();
      },
      error: (error) => {
        console.error('Error comparing versions', error);
        this.errorMessage = 'Erreur lors de la comparaison des versions.';
        this.isLoading = false;
      }
    });
  }

  closeComparison(): void {
    // Nettoyer les ressources
    if (this.comparisonPdfUrl) {
      URL.revokeObjectURL(this.comparisonPdfUrl.toString());
    }
    this.close.emit();
  }
}