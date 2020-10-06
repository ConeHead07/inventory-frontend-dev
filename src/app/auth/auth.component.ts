import {Component, OnInit, Input, OnDestroy} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {AuthResponseData, AuthService} from './auth.service';
import {Observable, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {BasedataService} from '../basedata.service';
import {ConnectionService, ConnectionState} from '../connection-service.service';

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
    console.log('onLoginSubmit #32', this.form);

    let authObs: Observable<AuthResponseData>;

    let url = '';
    const email = this.form.email;
    const password = this.form.password;
    const originDomain = (window && window.location && window.location.origin)
      ? window.location.origin.split(':').slice(0, 2).join(':')
      : 'http://127.0.0.1';

    url = originDomain + ':8040/auth/login/';
    console.log('onLoginSubmit #44', { url });

    authObs = this.authService.login(email, password);
    console.log('onLoginSubmit #47', { url });

    this.isLoading = true;
    authObs.subscribe(
      resData => {
        console.log(resData);
        this.isLoading = false;
        this.router.navigate(['/select-inventory']);
        this.form.email = '';
        this.form.password = '';
      },
      errorMessage => {
        console.log( errorMessage );
        this.error = errorMessage;
        this.isLoading = false;
      }
    );
    console.log('onLoginSubmit #63', { url });
  }

}
