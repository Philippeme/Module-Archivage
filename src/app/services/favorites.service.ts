import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Document } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly FAVORITES_KEY = 'archiveModuleFavorites';
  private readonly RECENT_DOCS_KEY = 'archiveModuleRecentDocs';
  private readonly MAX_RECENT_DOCS = 10;

  private favoritesSubject = new BehaviorSubject<Document[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  private recentDocumentsSubject = new BehaviorSubject<Document[]>([]);
  public recentDocuments$ = this.recentDocumentsSubject.asObservable();

  constructor() {
    this.loadFavorites();
    this.loadRecentDocuments();
  }

  // Méthodes pour les favoris
  loadFavorites(): void {
    const storedFavorites = localStorage.getItem(this.FAVORITES_KEY);
    if (storedFavorites) {
      try {
        const favorites = JSON.parse(storedFavorites);
        // Conversion des dates de string à Date
        favorites.forEach((doc: Document) => {
          doc.creationDate = new Date(doc.creationDate);
          doc.lastModificationDate = new Date(doc.lastModificationDate);
        });
        this.favoritesSubject.next(favorites);
      } catch (error) {
        console.error('Erreur lors du chargement des favoris', error);
        this.favoritesSubject.next([]);
      }
    }
  }

  saveFavorites(favorites: Document[]): void {
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    this.favoritesSubject.next(favorites);
  }

  addToFavorites(document: Document): void {
    const currentFavorites = this.favoritesSubject.value;
    // Vérifier si le document est déjà dans les favoris
    if (!currentFavorites.some(doc => doc.id === document.id)) {
      const updatedFavorites = [...currentFavorites, document];
      this.saveFavorites(updatedFavorites);
    }
  }

  removeFromFavorites(documentId: string): void {
    const currentFavorites = this.favoritesSubject.value;
    const updatedFavorites = currentFavorites.filter(doc => doc.id !== documentId);
    this.saveFavorites(updatedFavorites);
  }

  isFavorite(documentId: string): boolean {
    return this.favoritesSubject.value.some(doc => doc.id === documentId);
  }

  // Méthodes pour les documents récents
  loadRecentDocuments(): void {
    const storedRecentDocs = localStorage.getItem(this.RECENT_DOCS_KEY);
    if (storedRecentDocs) {
      try {
        const recentDocs = JSON.parse(storedRecentDocs);
        // Conversion des dates de string à Date
        recentDocs.forEach((doc: Document) => {
          doc.creationDate = new Date(doc.creationDate);
          doc.lastModificationDate = new Date(doc.lastModificationDate);
        });
        this.recentDocumentsSubject.next(recentDocs);
      } catch (error) {
        console.error('Erreur lors du chargement des documents récents', error);
        this.recentDocumentsSubject.next([]);
      }
    }
  }

  saveRecentDocuments(documents: Document[]): void {
    localStorage.setItem(this.RECENT_DOCS_KEY, JSON.stringify(documents));
    this.recentDocumentsSubject.next(documents);
  }

  addToRecentDocuments(document: Document): void {
    // Ne pas ajouter de document nul
    if (!document) return;

    const currentRecentDocs = this.recentDocumentsSubject.value;
    // Enlever le document s'il est déjà dans la liste
    const filteredDocs = currentRecentDocs.filter(doc => doc.id !== document.id);
    // Ajouter le document au début de la liste
    const updatedRecentDocs = [document, ...filteredDocs];
    // Limiter le nombre de documents récents
    const limitedRecentDocs = updatedRecentDocs.slice(0, this.MAX_RECENT_DOCS);
    
    this.saveRecentDocuments(limitedRecentDocs);
  }

  clearRecentDocuments(): void {
    this.saveRecentDocuments([]);
  }
}