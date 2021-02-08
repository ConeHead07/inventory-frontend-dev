
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSquare, faCheckSquare, faBarcode, faUser, faKey } from '@fortawesome/free-solid-svg-icons';
import { faSquare as farSquare, faCheckSquare as farCheckSquare } from '@fortawesome/free-regular-svg-icons';
import { faStackOverflow, faGithub, faMedium } from '@fortawesome/free-brands-svg-icons';

import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthComponent } from './auth/auth.component';
import { Routes, RouterModule } from '@angular/router';
import { SelectInventoryComponent } from './select-inventory/select-inventory.component';
import { NgbheaderComponent } from './ngbheader/ngbheader.component';
import { InventFormComponent } from './invent-form/invent-form.component';
import { InventoryProgressDirective } from './inventory-progress.directive';
import { ProgressbarComponent } from './inventory/components/progressbar/progressbar.component';
import { AuthInterceptorService } from './auth/auth-interceptor.service';
import { SelectCreateRaumComponent } from './invent-form/modals/select-create-raum/select-create-raum.component';
import { SelectCreateArtikelComponent } from './invent-form/modals/select-create-artikel/select-create-artikel.component';
import { CreateArtikelImageComponent } from './invent-form/modals/create-artikel-image/create-artikel-image.component';
import { ShowArtikelImageComponent } from './invent-form/modals/show-artikel-image/show-artikel-image.component';
import { SelectSearchRaumComponent } from './invent-form/modals/select-search-raum/select-search-raum.component';
import { SelectSearchArtikelComponent } from './invent-form/modals/select-search-artikel/select-search-artikel.component';
import { ApiService } from './api.service';
import { StatusCheckComponent } from './status-check/status-check.component';
import { WebcamModule } from 'ngx-webcam';
import { AngularCropperjsModule } from 'angular-cropperjs';
// import imageCompression from 'browser-image-compression';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';

// the scanner
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ScannerComponent } from './invent-form/modals/scanner/scanner.component';
import { ScannerinputDirective } from './scannerinput.directive';
import { ScannerdetectionComponent } from './inventory/components/scannerdetection/scannerdetection.component';
import { RaumListDoneComponent } from './invent-form/modals/raum-list-done/raum-list-done.component';
import { RaumListRestComponent } from './invent-form/modals/raum-list-rest/raum-list-rest.component';
import { GesamtListRestComponent } from './invent-form/modals/gesamt-list-rest/gesamt-list-rest.component';
import { GesamtListDoneComponent } from './invent-form/modals/gesamt-list-done/gesamt-list-done.component';
import { DbsyncComponent } from './inventory/components/dbsync/dbsync.component';
import { SettingsComponent } from './inventory/components/settings/settings.component';
import { environment } from '../environments/environment';
import { ServiceWorkerModule } from '@angular/service-worker';
import { EditRaumComponent } from './invent-form/modals/edit-raum/edit-raum.component';
import { EditInventarComponent } from './invent-form/modals/edit-inventar/edit-inventar.component';

const appRoutes: Routes = [
  { path: '', component: AuthComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'select-inventory', component: SelectInventoryComponent },
  { path: 'form-inventory/:clientid/:buildingid/:roomid', component: InventFormComponent },
  { path: 'form-inventory/:clientid/:buildingid', component: InventFormComponent },
  { path: 'form-inventory', component: InventFormComponent },
  { path: 'sync', component: DbsyncComponent },
  { path: 'settings', component: SettingsComponent }
];

async function persist() {
  return navigator.storage && navigator.storage.persist && await navigator.storage.persist();
}
if ('localStorage' in window && localStorage.getItem('ClientDeviceId') === null) {
  localStorage.setItem('ClientDeviceId', JSON.stringify(0) );
}
persist();

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    SelectInventoryComponent,
    NgbheaderComponent,
    InventFormComponent,
    InventoryProgressDirective,
    ProgressbarComponent,
    SelectCreateRaumComponent,
    SelectCreateArtikelComponent,
    CreateArtikelImageComponent,
    ShowArtikelImageComponent,
    ScannerComponent,
    ScannerinputDirective,
    ScannerdetectionComponent,
    SelectSearchRaumComponent,
    SelectSearchArtikelComponent,
    StatusCheckComponent,
    RaumListDoneComponent,
    RaumListRestComponent,
    GesamtListRestComponent,
    GesamtListDoneComponent,
    DbsyncComponent,
    SettingsComponent,
    EditRaumComponent
    , EditInventarComponent
],
  imports: [
    BrowserModule,
    FormsModule,
    NgbModule,
    HttpClientModule,
    RouterModule.forRoot( appRoutes ),
    FontAwesomeModule,
    ZXingScannerModule,
    WebcamModule,
    AngularCropperjsModule,
    BrowserAnimationsModule, // required animations module
    ToastrModule.forRoot({
      enableHtml: true,
      closeButton: true,
      progressBar: true,
      maxOpened: 6,
      autoDismiss: true,
      preventDuplicates: true,
      resetTimeoutOnDuplicate: true
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately'
    })
  ],
  entryComponents: [
    CreateArtikelImageComponent,
    ShowArtikelImageComponent,
    ScannerComponent,
    SelectCreateArtikelComponent,
    SelectCreateRaumComponent,
    SelectSearchRaumComponent,
    SelectSearchArtikelComponent,
    RaumListDoneComponent,
    RaumListRestComponent,
    GesamtListRestComponent,
    GesamtListDoneComponent,
    EditRaumComponent
    , EditInventarComponent
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
    },
    ApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor() {
    library.add( faSquare, faCheckSquare, faBarcode, faUser, faKey,
      farSquare, farCheckSquare,
      faStackOverflow, faGithub, faMedium);
  }
}
