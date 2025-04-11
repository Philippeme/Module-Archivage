import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.scss']
})
export class AccessDeniedComponent {

  constructor(
    private location: Location,
    private router: Router
  ) { }

  goBack(): void {
    // Essayer de revenir en arrière, sinon aller à la page d'accueil
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/archives']);
    }
  }
}