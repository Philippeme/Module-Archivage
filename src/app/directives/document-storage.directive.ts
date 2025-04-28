// src/app/directives/document-storage.directive.ts
import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { DocumentService } from '../services/document.service';

@Directive({
  selector: '[appDocumentStorage]'
})
export class DocumentStorageDirective {
  @Input() documentId: string;
  @Input() documentType: string;
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private documentService: DocumentService
  ) { }
  
  @HostListener('click')
  onClick(): void {
    // Lorsqu'on clique sur l'élément, on vérifie si le document est stocké localement
    this.documentService.isDocumentCached(this.documentId).subscribe(isCached => {
      if (!isCached) {
        // Si le document n'est pas mis en cache, on le télécharge et on le stocke
        this.documentService.cacheDocument(this.documentId).subscribe({
          next: () => {
            // Ajouter une classe pour indiquer que le document est mis en cache
            this.renderer.addClass(this.el.nativeElement, 'document-cached');
          },
          error: (error) => {
            console.error('Erreur lors de la mise en cache du document', error);
          }
        });
      }
    });
  }
}