import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Document, Folder } from '../../models/document.model';

@Component({
  selector: 'app-document-grid',
  templateUrl: './document-grid.component.html',
  styleUrls: ['./document-grid.component.scss']
})
export class DocumentGridComponent {
  @Input() folders: Folder[] = [];
  @Input() documents: Document[] = [];
  @Output() folderSelected = new EventEmitter<Folder>();
  @Output() folderContextMenu = new EventEmitter<Folder>();
  @Output() documentSelected = new EventEmitter<Document>();

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

  downloadDocument(document: Document, event: Event): void {
    event.stopPropagation();
    // Implémentation du téléchargement
    console.log('Téléchargement de', document.originalName);
  }

  openDocument(document: Document, event: Event): void {
    event.stopPropagation();
    this.documentSelected.emit(document);
  }

  shareDocument(document: Document, event: Event): void {
    event.stopPropagation();
    // Implémentation du partage par email
    console.log('Partage de', document.originalName);
  }
}