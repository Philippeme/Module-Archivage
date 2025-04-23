import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Folder } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-shortcuts',
  templateUrl: './shortcuts.component.html',
  styleUrls: ['./shortcuts.component.scss']
})
export class ShortcutsComponent implements OnInit {
  @Input() navigationMode: 'time' | 'location' = 'time';
  @Output() folderSelected = new EventEmitter<Folder>();
  
  rootFolders: Folder[] = [];
  isLoading = false;
  
  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
    this.loadRootFolders();
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
      },
      error: (error) => {
        console.error('Error loading root folders', error);
        this.isLoading = false;
      }
    });
  }

  navigateToFolder(folder: Folder): void {
    this.folderSelected.emit(folder);
  }
  
  getQuickFolders(): { title: string, folders: Folder[] }[] {
    if (this.navigationMode === 'time') {
      return [
        { 
          title: 'Cette année', 
          folders: this.generateYearFolders([new Date().getFullYear()]) 
        },
        { 
          title: 'Années précédentes', 
          folders: this.generateYearFolders([
            new Date().getFullYear() - 1,
            new Date().getFullYear() - 2,
            new Date().getFullYear() - 3
          ]) 
        }
      ];
    } else {
      return [
        { 
          title: 'Régions principales', 
          folders: this.generateRegionFolders([
            'District de Bamako',
            'Kayes',
            'Koulikoro',
            'Sikasso'
          ]) 
        }
      ];
    }
  }
  
  private generateYearFolders(years: number[]): Folder[] {
    if (this.rootFolders.length === 0) return [];
    
    const folders: Folder[] = [];
    
    for (const documentType of this.rootFolders) {
      for (const year of years) {
        folders.push({
          name: `${documentType.name} - ${year}`,
          path: `${documentType.path}${year}/`,
          type: 'year',
          iconClass: 'bi-calendar-year',
          colorClass: 'text-primary'
        });
      }
    }
    
    return folders;
  }
  
  private generateRegionFolders(regions: string[]): Folder[] {
    if (this.rootFolders.length === 0) return [];
    
    const folders: Folder[] = [];
    
    for (const documentType of this.rootFolders) {
      for (const region of regions) {
        folders.push({
          name: `${documentType.name} - ${region}`,
          path: `${documentType.path}${region}/`,
          type: 'region',
          iconClass: 'bi-geo-alt',
          colorClass: 'text-danger'
        });
      }
    }
    
    return folders;
  }
}