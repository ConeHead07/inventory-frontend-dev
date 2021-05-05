import {Component, OnInit, Input, OnDestroy} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {AuthResponseData, AuthService} from './auth.service';
import {Observable, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {BasedataService} from '../../shared/services/basedata.service';
import {ConnectionService, ConnectionState} from '../../shared/services/connection-service.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit, OnDestroy {
  isLoginMode = true;
  isLoading = false;
  error: string = null;

  @Input() username: string;
  @Input() password: string;

  @Input() onlineStatusMessage: string;
  @Input() onlineStatus: string;

  hasConnection = false;
  hasServerConnection = false;

  connectionSubscription: Subscription;

  public form = {
    email: null,
    password: null,
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private connection: ConnectionService,
    private baseData: BasedataService) {
  }

  ngOnInit() {
    this.authService.logout();
    this.hasConnection = this.connection.hasServerAccess;
    this.hasServerConnection = this.connection.hasServerAccess;

    this.connectionSubscription = this.connection.monitor().subscribe( (conn: ConnectionState) => {
      this.hasConnection = conn.hasNetworkConnection;
      this.hasServerConnection = conn.hasServerAccess;
    });
  }

  ngOnDestroy() {
    this.connectionSubscription.unsubscribe();
  }

  onLoginSubmit() {
    let auth: Promise<any>;

    const email = this.form.email;
    const password = this.form.password;

    this.isLoading = true;
    auth = this.authService.login(email, password);
    auth.then( (resData) => {
      console.log(resData);
      this.isLoading = false;
      this.router.navigate(['/select-inventory']);
      this.form.email = '';
      this.form.password = '';
    });
    auth.catch( (errorMessage) => {
      console.error('AuthComponent.onLoginSubmit() #73', errorMessage );
      this.error = errorMessage;
      this.isLoading = false;
    });
  }

}
