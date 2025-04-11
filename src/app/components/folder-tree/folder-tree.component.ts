import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-folder-tree',
  templateUrl: './folder-tree.component.html',
  styleUrls: ['./folder-tree.component.scss']
})
export class FolderTreeComponent implements OnInit, OnChanges {
  @Input() navigationMode: 'time' | 'location' = 'time';
  @Input() currentPath: string = '/Archives';
  @Output() folderSelected = new EventEmitter<Folder>();
  
  rootFolders: Folder[] = [];
  expandedFolders: { [path: string]: boolean } = {};
  loadedFolders: { [path: string]: Folder[] } = {};
  isLoading = false;

  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
    this.loadRootFolders();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['navigationMode'] && !changes['navigationMode'].firstChange) {
      // Réinitialiser l'arborescence lors du changement de mode de navigation
      this.expandedFolders = {};
      this.loadedFolders = {};
      this.loadRootFolders();
    }
    
    if (changes['currentPath'] && !changes['currentPath'].firstChange) {
      // Développer les dossiers jusqu'au chemin actuel
      this.expandPathToCurrentFolder();
    }
  }

  loadRootFolders(): void {
    this.isLoading = true;
    this.documentService.getRootFolders().subscribe({
      next: (folders) => {
        this.rootFolders = folders.map(folder => ({
          ...folder,
          iconClass: this.documentService.getFolderIcon({ ...folder, type: 'document-type' }),
          colorClass: this.documentService.getFolderColor({ ...folder, type: 'document-type' })
        }));
        this.isLoading = false;
        
        // Développer les dossiers jusqu'au chemin actuel
        this.expandPathToCurrentFolder();
      },
      error: (error) => {
        console.error('Error loading root folders', error);
        this.isLoading = false;
      }
    });
  }

  expandPathToCurrentFolder(): void {
    if (!this.currentPath || this.currentPath === '/Archives') {
      return;
    }
    
    const pathSegments = this.currentPath.split('/').filter(segment => segment !== '');
    if (pathSegments.length <= 1) {
      return;
    }
    
    // Développer chaque segment du chemin
    let currentPath = '/Archives';
    
    for (let i = 1; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;
      this.expandedFolders[currentPath] = true;
      
      // Charger les sous-dossiers si nécessaire
      this.loadSubfolders(currentPath);
    }
  }

  loadSubfolders(path: string): void {
    if (this.loadedFolders[path]) {
      return; // Les sous-dossiers sont déjà chargés
    }
    
    this.isLoading = true;
    this.documentService.loadFolders(path, this.navigationMode).subscribe({
      next: (folders) => {
        this.loadedFolders[path] = folders.map(folder => ({
          ...folder,
          iconClass: this.documentService.getFolderIcon(folder),
          colorClass: this.documentService.getFolderColor(folder)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading subfolders', error);
        this.isLoading = false;
      }
    });
  }

  toggleFolder(folder: Folder, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Inverser l'état d'expansion
    this.expandedFolders[folder.path] = !this.expandedFolders[folder.path];
    
    // Charger les sous-dossiers si le dossier est développé et que les sous-dossiers ne sont pas encore chargés
    if (this.expandedFolders[folder.path] && !this.loadedFolders[folder.path]) {
      this.loadSubfolders(folder.path);
    }
  }

  selectFolder(folder: Folder, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.folderSelected.emit(folder);
  }

  isFolderExpanded(folder: Folder): boolean {
    return this.expandedFolders[folder.path] || false;
  }

  getFolderSubfolders(folder: Folder): Folder[] {
    return this.loadedFolders[folder.path] || [];
  }

  isCurrentFolder(folder: Folder): boolean {
    return this.currentPath === folder.path;
  }
}