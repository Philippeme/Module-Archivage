import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Document, DocumentComment } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-document-comments',
  templateUrl: './document-comments.component.html',
  styleUrls: ['./document-comments.component.scss']
})
export class DocumentCommentsComponent implements OnChanges {
  @Input() document: Document | null = null;
  
  comments: DocumentComment[] = [];
  commentForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private documentService: DocumentService,
    private formBuilder: FormBuilder
  ) {
    this.commentForm = this.formBuilder.group({
      text: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(500)]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      this.loadComments();
    }
  }

  loadComments(): void {
    if (!this.document) return;
    
    this.isLoading = true;
    this.documentService.getDocumentComments(this.document.id).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading comments', error);
        this.errorMessage = 'Erreur lors du chargement des commentaires.';
        this.isLoading = false;
      }
    });
  }

  addComment(): void {
    if (this.commentForm.invalid || !this.document) {
      return;
    }
    
    this.isLoading = true;
    const text = this.commentForm.get('text')?.value;
    
    this.documentService.addDocumentComment(this.document.id, text).subscribe({
      next: (comment) => {
        this.comments.unshift(comment); // Ajouter le commentaire au début de la liste
        this.commentForm.reset();
        this.isLoading = false;
        
        // Enregistrer l'action d'ajout de commentaire
        this.documentService.recordDocumentAction(
          this.document!.id, 
          'COMMENT_ADD' as any, 
          'Commentaire ajouté'
        ).subscribe();
      },
      error: (error) => {
        console.error('Error adding comment', error);
        this.errorMessage = 'Erreur lors de l\'ajout du commentaire.';
        this.isLoading = false;
      }
    });
  }
}