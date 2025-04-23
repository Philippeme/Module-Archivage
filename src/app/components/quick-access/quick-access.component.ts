import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Document } from '../../models/document.model';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-quick-access',
  templateUrl: './quick-access.component.html',
  styleUrls: ['./quick-access.component.scss']
})
export class QuickAccessComponent implements OnInit {
  @Output() documentSelected = new EventEmitter<Document>();

  favoriteDocuments: Document[] = [];
  recentDocuments: Document[] = [];
  activeTab: 'favorites' | 'recent' = 'favorites';

  constructor(private favoritesService: FavoritesService) { }

  ngOnInit(): void {
    // S'abonner aux favoris
    this.favoritesService.favorites$.subscribe(favorites => {
      this.favoriteDocuments = favorites;
    });

    // S'abonner aux documents récents
    this.favoritesService.recentDocuments$.subscribe(recentDocs => {
      this.recentDocuments = recentDocs;
    });
  }

  onDocumentClick(document: Document): void {
    this.documentSelected.emit(document);
  }

  setActiveTab(tab: 'favorites' | 'recent'): void {
    this.activeTab = tab;
  }

  removeFromFavorites(document: Document, event: Event): void {
    event.stopPropagation();
    this.favoritesService.removeFromFavorites(document.id);
  }

  clearRecentDocuments(): void {
    this.favoritesService.clearRecentDocuments();
  }
}