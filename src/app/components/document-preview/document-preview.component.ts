import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Document } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.scss']
})
export class DocumentPreviewComponent implements OnChanges {
  @Input() document: Document | null = null;
  @Output() close = new EventEmitter<void>();
  
  documentVersions: Document[] = [];
  selectedVersion: Document | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private documentService: DocumentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      this.selectedVersion = this.document;
      this.loadDocumentVersions();
      this.loadDocumentContent();
    }
  }

  loadDocumentVersions(): void {
    if (!this.document) return;
    
    this.isLoading = true;
    this.documentService.getDocumentVersions(this.document.id).subscribe({
      next: (versions) => {
        this.documentVersions = versions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading document versions', error);
        this.errorMessage = 'Erreur lors du chargement des versions du document.';
        this.isLoading = false;
      }
    });
  }

  loadDocumentContent(): void {
    if (!this.selectedVersion) return;
    
    this.isLoading = true;
    this.pdfUrl = null;
    this.errorMessage = '';
    
    this.documentService.downloadDocument(this.selectedVersion.id).subscribe({
      next: (blob) => {
        // Créer une URL pour le PDF
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(pdfBlob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading document content', error);
        this.errorMessage = 'Erreur lors du chargement du contenu du document.';
        this.isLoading = false;
      }
    });
  }

  selectVersion(version: Document): void {
    this.selectedVersion = version;
    this.loadDocumentContent();
  }

  closePreview(): void {
    // Nettoyer les ressources
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl.toString());
    }
    this.close.emit();
  }

  downloadCurrentDocument(): void {
    if (!this.selectedVersion) return;
    
    this.documentService.downloadDocument(this.selectedVersion.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.selectedVersion?.originalName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (error) => {
        console.error('Error downloading document', error);
        this.errorMessage = 'Erreur lors du téléchargement du document.';
      }
    });
  }

  shareCurrentDocument(): void {
    if (!this.selectedVersion) return;
    
    const email = prompt('Veuillez entrer l\'adresse email du destinataire :');
    
    if (email) {
      // Validation simple de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Veuillez entrer une adresse email valide.');
        return;
      }
      
      this.isLoading = true;
      this.documentService.shareDocumentByEmail(this.selectedVersion.id, email).subscribe({
        next: (success) => {
          alert(`Document partagé avec succès à ${email}`);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error sharing document', error);
          alert('Erreur lors du partage du document. Veuillez réessayer plus tard.');
          this.isLoading = false;
        }
      });
    }
  }
}