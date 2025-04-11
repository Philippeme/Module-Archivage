import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

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
import { AuthInterceptor } from './interceptors/auth.interceptor';

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
    DocumentPreviewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }