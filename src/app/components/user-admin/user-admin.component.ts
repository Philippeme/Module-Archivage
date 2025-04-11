import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User, UserLevel, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-user-admin',
  templateUrl: './user-admin.component.html',
  styleUrls: ['./user-admin.component.scss']
})
export class UserAdminComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  userForm: FormGroup;
  modalTitle = '';
  modalAction = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Options pour les formulaires select
  userRoles = Object.values(UserRole);
  userLevels = Object.values(UserLevel);

  // Régions disponibles
  availableRegions = [
    'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'District de Bamako'
  ];

  // Centres d'état civil disponibles
  availableCenters = [
    'Centre d\'État Civil A', 'Centre d\'État Civil B', 'Centre d\'État Civil C'
  ];

  // Tribunaux disponibles
  availableTribunals = [
    'Tribunal de Kayes', 'Tribunal de Bamako', 'Tribunal de Sikasso'
  ];

  // Centres de déclaration disponibles
  availableDeclarationCenters = [
    'Centre de Déclaration de Kayes', 'Centre de Déclaration de Bamako', 'Centre de Déclaration de Sikasso'
  ];

  // Dans la classe UserAdminComponent
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router  // Ajout du Router
  ) {
    this.userForm = this.createUserForm();
  }



  // Méthode de navigation
  navigateBack(): void {
    this.router.navigate(['/archives']);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Erreur lors du chargement des utilisateurs: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  createUserForm(): FormGroup {
    return this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: [UserRole.USER, Validators.required],
      level: [UserLevel.CENTER, Validators.required],
      regions: [[]],
      centers: [[]],
      tribunals: [[]],
      declarationCenters: [[]],
      active: [true]
    });
  }

  onAddUser(): void {
    this.selectedUser = null;
    this.userForm = this.createUserForm();
    this.modalTitle = 'Ajouter un nouvel utilisateur';
    this.modalAction = 'create';
    this.clearMessages();

    // Ouvrir la modal (vous devrez ajouter l'attribut data-bs-toggle et data-bs-target à votre bouton)
    const modal = document.getElementById('userModal');
    if (modal) {
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  onEditUser(user: User): void {
    this.selectedUser = user;
    this.clearMessages();

    this.userForm = this.formBuilder.group({
      username: [user.username, [Validators.required, Validators.minLength(3)]],
      password: ['', []],  // Mot de passe optionnel lors de l'édition
      firstName: [user.firstName, Validators.required],
      lastName: [user.lastName, Validators.required],
      email: [user.email, [Validators.required, Validators.email]],
      role: [user.role, Validators.required],
      level: [user.level, Validators.required],
      regions: [user.regions || []],
      centers: [user.centers || []],
      tribunals: [user.tribunals || []],
      declarationCenters: [user.declarationCenters || []],
      active: [user.active]
    });

    this.modalTitle = 'Modifier l\'utilisateur';
    this.modalAction = 'update';

    // Ouvrir la modal
    const modal = document.getElementById('userModal');
    if (modal) {
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  onDeleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.firstName} ${user.lastName} ?`)) {
      this.isLoading = true;
      this.clearMessages();

      this.authService.deleteUser(user.id).subscribe({
        next: () => {
          this.successMessage = 'Utilisateur supprimé avec succès';
          this.loadUsers();
        },
        error: (error) => {
          this.errorMessage = `Erreur lors de la suppression de l'utilisateur: ${error.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    // Préparer les données de l'utilisateur
    const userData = this.prepareUserData();

    if (this.modalAction === 'create') {
      this.authService.createUser(userData).subscribe({
        next: (user) => {
          this.successMessage = 'Utilisateur créé avec succès';
          this.loadUsers();
          this.closeModal();
        },
        error: (error) => {
          this.errorMessage = `Erreur lors de la création de l'utilisateur: ${error.message}`;
          this.isLoading = false;
        }
      });
    } else if (this.modalAction === 'update' && this.selectedUser) {
      this.authService.updateUser(this.selectedUser.id, userData).subscribe({
        next: (user) => {
          this.successMessage = 'Utilisateur mis à jour avec succès';
          this.loadUsers();
          this.closeModal();
        },
        error: (error) => {
          this.errorMessage = `Erreur lors de la mise à jour de l'utilisateur: ${error.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  prepareUserData(): any {
    const formValue = this.userForm.value;

    // Ne pas inclure le mot de passe si vide lors de la mise à jour
    if (this.modalAction === 'update' && !formValue.password) {
      const { password, ...userData } = formValue;
      return userData;
    }

    return formValue;
  }

  closeModal(): void {
    const modal = document.getElementById('userModal');
    if (modal) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bsModal) {
        bsModal.hide();
      }
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Gestionnaires pour les champs multi-select
  onLevelChange(): void {
    const level = this.userForm.get('level')?.value;

    // Réinitialiser les champs selon le niveau sélectionné
    this.userForm.patchValue({
      regions: [],
      centers: [],
      tribunals: [],
      declarationCenters: []
    });
  }
}