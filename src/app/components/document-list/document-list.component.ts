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

  constructor(private documentService: DocumentService) { }

  onFolderClick(folder: Folder): void {
    this.folderSelected.emit(folder);
  }

  onFolderRightClick(folder: Folder, event: MouseEvent): void {
    event.preventDefault();
    // Afficher un menu contextuel personnalisé
    const menuItems = [
      { label: 'Ouvrir dans un nouvel onglet', action: 'newtab' },
      { label: 'Voir les détails', action: 'details' }
    ];
    
    // Créer et positionner le menu contextuel
    this.createContextMenu(event, menuItems, (action: string) => {
      if (action === 'newtab') {
        this.folderContextMenu.emit(folder);
      } else if (action === 'details') {
        // Pour une future implémentation
        console.log('Afficher les détails de', folder.name);
      }
    });
  }
  
  private createContextMenu(event: MouseEvent, items: { label: string, action: string }[], callback: (action: string) => void): void {
    // Supprimer tout menu contextuel existant
    const existingMenu = document.querySelector('.custom-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Créer le menu
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    menu.style.backgroundColor = '#ffffff';
    menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.zIndex = '1000';
    
    // Ajouter les éléments du menu
    items.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.label;
      menuItem.style.padding = '8px 12px';
      menuItem.style.cursor = 'pointer';
      menuItem.style.fontSize = '14px';
      
      menuItem.onmouseover = () => {
        menuItem.style.backgroundColor = '#f8f9fa';
      };
      
      menuItem.onmouseout = () => {
        menuItem.style.backgroundColor = 'transparent';
      };
      
      menuItem.onclick = () => {
        callback(item.action);
        menu.remove();
      };
      
      menu.appendChild(menuItem);
    });
    
    // Ajouter le menu au DOM
    document.body.appendChild(menu);
    
    // Supprimer le menu lorsqu'on clique ailleurs
    document.addEventListener('click', () => {
      menu.remove();
    }, { once: true });
    
    // Empêcher la propagation pour éviter de fermer immédiatement
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
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