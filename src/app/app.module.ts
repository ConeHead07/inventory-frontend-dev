
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
import { HeaderComponent } from './header/header.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthComponent } from './auth/auth.component';
import { TestComponent } from './test/test.component';
import { Routes, RouterModule } from '@angular/router';
import { SelectInventoryComponent } from './select-inventory/select-inventory.component';
import { NgbheaderComponent } from './ngbheader/ngbheader.component';
import { InventFormComponent } from './invent-form/invent-form.component';
import { InventoryProgressDirective } from './inventory-progress.directive';
import { ProgressbarComponent } from './inventory/components/progressbar/progressbar.component';
import {AuthInterceptorService} from "./auth/auth-interceptor.service";

const appRoutes: Routes = [
  { path: '', component: AuthComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'test', component: TestComponent },
  { path: 'select-inventory', component: SelectInventoryComponent },
  { path: 'form-inventory', component: InventFormComponent }
];


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    AuthComponent,
    TestComponent,
    SelectInventoryComponent,
    NgbheaderComponent,
    InventFormComponent,
    InventoryProgressDirective,
    ProgressbarComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgbModule,
    HttpClientModule,
    RouterModule.forRoot( appRoutes ),
    FontAwesomeModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor() {
    library.add( faSquare, faCheckSquare, faBarcode, faUser, faKey,
      farSquare, farCheckSquare,
      faStackOverflow, faGithub, faMedium)
  }
}
