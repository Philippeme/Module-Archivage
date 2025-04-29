import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Document, ActionType } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { FavoritesService } from '../../services/favorites.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.scss']
})
export class DocumentPreviewComponent implements OnChanges {
  @Input() document: Document | null = null;
  @Output() close = new EventEmitter<void>();

  selectedVersion: Document | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  isLoading = false;
  errorMessage = '';

  isPreviewMode = true; // Pour basculer entre prévisualisation et document complet
  shareSuccess = '';
  showShareModal = false;

  constructor(
    private documentService: DocumentService,
    private favoritesService: FavoritesService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      this.selectedVersion = this.document;

      // Charger en mode prévisualisation d'abord
      this.loadDocumentPreview();

      // Ajouter aux documents récents
      this.favoritesService.addToRecentDocuments(this.document);

      // Enregistrer l'action de consultation
      this.documentService.recordDocumentAction(this.document.id, ActionType.VIEW).subscribe();
    }
  }

  loadDocumentPreview(): void {
    if (!this.selectedVersion) return;

    this.isLoading = true;
    this.pdfUrl = null;
    this.errorMessage = '';

    // Utiliser la prévisualisation légère ou le document complet selon le mode
    const loadMethod = this.isPreviewMode
      ? this.documentService.getDocumentPreview(this.selectedVersion.id)
      : this.documentService.downloadDocument(this.selectedVersion.id);

    loadMethod.subscribe({
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

  toggleViewMode(): void {
    this.isPreviewMode = !this.isPreviewMode;

    // Recharger le document dans le nouveau mode
    if (this.selectedVersion) {
      this.loadDocumentPreview();
    }
  }

  closePreview(): void {
    // Nettoyer les ressources
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl.toString());
    }
    this.close.emit();
  }

  isFavorite(): boolean {
    if (!this.selectedVersion) return false;
    return this.favoritesService.isFavorite(this.selectedVersion.id);
  }

  toggleFavorite(): void {
    if (!this.selectedVersion) return;

    if (this.isFavorite()) {
      this.favoritesService.removeFromFavorites(this.selectedVersion.id);
    } else {
      this.favoritesService.addToFavorites(this.selectedVersion);
    }
  }

  downloadCurrentDocument(): void {
    if (!this.selectedVersion) return;

    // Créer une référence locale que TypeScript sait ne pas être null
    const version = this.selectedVersion;

    this.documentService.downloadDocument(version.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = version.originalName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        // Utiliser la référence locale ici
        this.documentService.recordDocumentAction(version.id, ActionType.DOWNLOAD).subscribe();
      },
      error: (error) => {
        console.error('Error downloading document', error);
        this.errorMessage = 'Erreur lors du téléchargement du document.';
      }
    });
  }

  shareCurrentDocument(): void {
    if (!this.selectedVersion) return;
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  handleShareSuccess(email: string): void {
    this.shareSuccess = `Document partagé avec succès à ${email}`;

    // Enregistrer l'action de partage
    if (this.selectedVersion) {
      this.documentService.recordDocumentAction(
        this.selectedVersion.id,
        ActionType.SHARE,
        `Partagé avec ${email}`
      ).subscribe();
    }

    // Cacher le message après 5 secondes
    setTimeout(() => {
      this.shareSuccess = '';
    }, 5000);
  }

  // Méthode pour formater la taille du fichier
  formatFileSize(size: number): string {
    if (size === 0) return '0 Ko';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}