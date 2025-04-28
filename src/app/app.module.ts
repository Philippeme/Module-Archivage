import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ArchiveComponent } from './components/archive/archive.component';
import { LoginComponent } from './components/login/login.component';
import { AccessDeniedComponent } from './components/access-denied/access-denied.component';
import { UserAdminComponent } from './components/user-admin/user-admin.component';
import { FolderTreeComponent } from './components/folder-tree/folder-tree.component';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentGridComponent } from './components/document-grid/document-grid.component';
import { FilterComponent } from './components/filter/filter.component';
import { DocumentPreviewComponent } from './components/document-preview/document-preview.component';
import { QuickAccessComponent } from './components/quick-access/quick-access.component';
import { ShortcutsComponent } from './components/shortcuts/shortcuts.component';
import { DocumentCommentsComponent } from './components/document-comments/document-comments.component';
import { DocumentHistoryComponent } from './components/document-history/document-history.component';
import { VersionComparisonComponent } from './components/version-comparison/version-comparison.component';
import { EmailShareModalComponent } from './components/email-share-modal/email-share-modal.component';
import { AdvancedFilterComponent } from './components/advanced-filter/advanced-filter.component';
import { SaveFilterDialogComponent } from './components/save-filter-dialog/save-filter-dialog.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Import du nouveau service
import { DatabaseService } from './services/database.service';

@NgModule({
  declarations: [
    AppComponent,
    ArchiveComponent,
    LoginComponent,
    AccessDeniedComponent,
    UserAdminComponent,
    FolderTreeComponent,
    DocumentListComponent,
    DocumentGridComponent,
    FilterComponent,
    DocumentPreviewComponent,
    QuickAccessComponent,
    ShortcutsComponent,
    DocumentCommentsComponent,
    DocumentHistoryComponent,
    VersionComparisonComponent,
    EmailShareModalComponent,
    AdvancedFilterComponent,
    SaveFilterDialogComponent,
    SearchBarComponent,
    SearchResultsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatDialogModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    DatabaseService // Ajout du service DatabaseService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }