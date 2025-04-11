import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';
  returnUrl: string = '/archives';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Rediriger vers la page d'accueil si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/archives']);
    }

    // Initialiser le formulaire
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Récupérer l'URL de retour des paramètres de requête ou utiliser la valeur par défaut
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/archives';
  }

  // Getter pour accéder facilement aux champs du formulaire
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    // Arrêter ici si le formulaire est invalide
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.f['username'].value, this.f['password'].value)
      .subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]);
        },
        error: error => {
          this.errorMessage = error.message || 'Identifiants invalides';
          this.loading = false;
        }
      });
  }
}