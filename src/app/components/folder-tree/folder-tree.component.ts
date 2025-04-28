// src/app/components/folder-tree/folder-tree.component.ts
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-folder-tree',
  templateUrl: './folder-tree.component.html',
  styleUrls: ['./folder-tree.component.scss']
})
export class FolderTreeComponent implements OnInit, OnChanges {
  @Input() navigationMode: 'date' | 'location' = 'date'; // Renommé de 'time' à 'date'
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
        // Conversion au pluriel des noms de dossiers
        this.rootFolders = folders.map(folder => ({
          ...folder,
          name: this.pluralizeFolderName(folder.name),
          iconClass: 'bi-folder-fill', // Uniformisation des icônes
          colorClass: 'text-warning'
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

  // Méthode pour convertir les noms de dossiers au pluriel
  pluralizeFolderName(name: string): string {
    // Vérifier si le nom est déjà au pluriel
    if (name.endsWith('s')) return name;
    
    // Cas spéciaux
    if (name === 'Acte de naissance') return 'Actes de naissance';
    if (name === 'Acte de mariage') return 'Actes de mariage';
    if (name === 'Acte de décès') return 'Actes de décès';
    if (name === 'Déclaration de naissance') return 'Déclarations de naissance';
    if (name === 'Déclaration de décès') return 'Déclarations de décès';
    if (name === 'Certificat de décès') return 'Certificats de décès';
    if (name === 'Publication de mariage') return 'Publications de mariage';
    if (name === 'Certificat de non opposition') return 'Certificats de non opposition';
    if (name === 'Fiche de non inscription') return 'Fiches de non inscription';
    if (name === 'Jugement supplétif') return 'Jugements supplétifs';
    if (name === 'Jugement rectificatif') return 'Jugements rectificatifs';
    if (name === 'Jugement d\'annulation') return 'Jugements d\'annulation';
    if (name === 'Jugement d\'homologation') return 'Jugements d\'homologation';
    if (name === 'Jugement déclaratif') return 'Jugements déclaratifs';
    
    // Cas général
    return name + 's';
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
          iconClass: this.getIconByType(folder.type), // Utiliser des icônes spécifiques par type
          colorClass: this.getColorByType(folder.type)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading subfolders', error);
        this.isLoading = false;
      }
    });
  }

  getIconByType(type: string): string {
    switch(type) {
      case 'year': return 'bi-calendar-year';
      case 'month': return 'bi-calendar-month';
      case 'day': return 'bi-calendar-day';
      case 'region': return 'bi-geo-alt';
      case 'circle': return 'bi-circle';
      case 'commune': return 'bi-building';
      case 'center': return 'bi-house-door';
      default: return 'bi-folder-fill';
    }
  }

  getColorByType(type: string): string {
    switch(type) {
      case 'year': return 'text-primary';
      case 'month': return 'text-success';
      case 'day': return 'text-info';
      case 'region': return 'text-danger';
      case 'circle': return 'text-warning';
      case 'commune': return 'text-purple';
      case 'center': return 'text-teal';
      default: return 'text-warning';
    }
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