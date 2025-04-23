import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Filter, SavedFilter } from '../../models/filter.model';

@Component({
  selector: 'app-save-filter-dialog',
  templateUrl: './save-filter-dialog.component.html',
  styleUrls: ['./save-filter-dialog.component.scss']
})
export class SaveFilterDialogComponent {
  saveForm: FormGroup;
  existingNames: string[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<SaveFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      filter: Filter,
      existingFilters: SavedFilter[]
    }
  ) {
    // Extraire les noms des filtres existants
    this.existingNames = this.data.existingFilters.map(f => f.name);
    
    // Créer le formulaire
    this.saveForm = this.formBuilder.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(50),
        this.uniqueNameValidator.bind(this)
      ]],
      description: [''],
      isDefault: [false]
    });
    
    // Si le filtre a déjà un nom (modification), le précharger
    if (this.data.filter.name) {
      this.saveForm.patchValue({
        name: this.data.filter.name,
        isDefault: this.data.filter.isDefault
      });
    }
  }

  uniqueNameValidator(control: any) {
    // Si le nom est celui d'un filtre existant, c'est une erreur (sauf si on modifie ce même filtre)
    const isExistingName = this.existingNames.includes(control.value) && 
                           this.data.filter.name !== control.value;
    return isExistingName ? { 'nameExists': true } : null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.saveForm.valid) {
      const formValues = this.saveForm.value;
      
      this.dialogRef.close({
        name: formValues.name,
        description: formValues.description,
        isDefault: formValues.isDefault
      });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.saveForm.controls).forEach(key => {
        this.saveForm.get(key)?.markAsTouched();
      });
    }
  }
}