import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Document, Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent {
  @Input() folders: Folder[] = [];
  @Input() documents: Document[] = [];
  @Output() folderSelected = new EventEmitter<Folder>();
  @Output() folderContextMenu = new EventEmitter<Folder>();
  @Output() documentSelected = new EventEmitter<Document>();

  // Ajouter le service dans le constructeur
  constructor(private documentService: DocumentService) { }

  onFolderClick(folder: Folder): void {
    this.folderSelected.emit(folder);
  }

  onFolderRightClick(folder: Folder, event: MouseEvent): void {
    event.preventDefault();
    this.folderContextMenu.emit(folder);
  }

  onDocumentClick(document: Document): void {
    this.documentSelected.emit(document);
  }

  downloadDocument(doc: Document, event: Event): void {
    event.stopPropagation();
    this.documentService.downloadDocument(doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = doc.originalName;
        window.document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        link.remove();
      },
      error: (error: any) => {
        console.error('Erreur lors du téléchargement', error);
        alert('Erreur lors du téléchargement du document.');
      }
    });
  }

  openDocument(document: Document, event: Event): void {
    event.stopPropagation();
    this.documentSelected.emit(document);
  }

  shareDocument(doc: Document, event: Event): void {
    event.stopPropagation();
    const email = prompt('Veuillez entrer l\'adresse email du destinataire :');

    if (email) {
      // Validation simple de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Veuillez entrer une adresse email valide.');
        return;
      }

      this.documentService.shareDocumentByEmail(doc.id, email).subscribe({
        next: () => {
          alert(`Document partagé avec succès à ${email}`);
        },
        error: (error: any) => {
          console.error('Erreur lors du partage', error);
          alert('Erreur lors du partage du document.');
        }
      });
    }
  }
}