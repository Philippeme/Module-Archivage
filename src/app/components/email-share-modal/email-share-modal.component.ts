import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Document } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-email-share-modal',
  templateUrl: './email-share-modal.component.html',
  styleUrls: ['./email-share-modal.component.scss']
})
export class EmailShareModalComponent implements OnInit {
  @Input() document: Document | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<string>();

  shareForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private formBuilder: FormBuilder,
    private documentService: DocumentService
  ) {
    this.shareForm = this.formBuilder.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
      includePreview: [true]
    });
  }

  ngOnInit(): void {
    if (this.document) {
      // Initialiser le sujet du mail avec le nom du document
      this.shareForm.patchValue({
        subject: `Partage de document: ${this.document.originalName}`,
        message: `Veuillez trouver ci-joint le document "${this.document.originalName}" du système d'archivage.\n\nCordialement,`
      });
    }
  }

  shareDocument(): void {
    if (this.shareForm.invalid || !this.document) {
      this.markFormGroupTouched(this.shareForm);
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const formValues = this.shareForm.value;
    
    this.documentService.shareDocumentByEmail(
      this.document.id, 
      formValues.recipientEmail,
      {
        subject: formValues.subject,
        message: formValues.message,
        includePreview: formValues.includePreview
      }
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.success.emit(formValues.recipientEmail);
        this.closeModal();
      },
      error: (error) => {
        console.error('Error sharing document', error);
        this.errorMessage = 'Erreur lors du partage du document. Veuillez réessayer plus tard.';
        this.isLoading = false;
      }
    });
  }
  
  // Marquer tous les champs comme touchés pour montrer les erreurs de validation
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}