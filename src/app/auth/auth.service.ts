import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {catchError, tap } from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import * as CryptoJS from 'crypto-js';

import { User } from './user.model';
import {BasedataService} from '../basedata.service';
import {ConnectionService} from '../connection-service.service';
import {ApiService} from '../api.service';

export interface AuthResponseData {
  kind: string;
  auth_identifier: number;
  access_token: string;
  expires_in: number;
  email: string;
  refreshToken: string;
  clientDeviceId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user = null;

  private authPath = '/auth/login';

  constructor(
    private http: HttpClient,
    private router: Router,
    private connection: ConnectionService,
    private baseData: BasedataService,
    private apiService: ApiService) {
  }

  logout() {
    this.baseData.setCurrentUser( null );
  }

  login(email: string, password: string): Observable<any> {
    const loginUrl = this.apiService.getUrlByPath(this.authPath);
    console.log('#37 AuthService.login', {email, password, loginUrl });
    const pwSalt = 'Inventory';
    const pwHash = CryptoJS.SHA3( pwSalt + password );

    const pwHashB64 = CryptoJS.enc.Base64.stringify(pwHash);
    if (!this.connection.hasNetworkConnection) {
      const lastUser = this.getUser();
      let err = 'Es besteht aktuell keine Serververbindung! ';
      if (lastUser) {
        if (lastUser.email === email) {
          if (lastUser.pwHash !== pwHashB64) {
            err += 'Passwort stimmt nicht mit dem ihrer letzten Anmeldung überein!' + '<br>';
            err += 'last pwHash: '  + lastUser.pwHash + '<br>';
            err += 'this pwHash: '  + pwHashB64 + '<br>';
            err += JSON.stringify(lastUser);
          } else {
            return new Observable( (observer) => {
              observer.next(true);
              observer.complete();
            });
          }
        } else {
          err += 'Die Email stimmt nicht mit der letzten Anmeldung überein. ';
          err += 'Im Offline-Modus kann nur die letzte Sitzung wieder aufgebaut werden!';
          err += 'Korrigieren Sie ihre Email-Angabe oder versuchen es erneut wenn sie online sind!';
        }
      } else {
        err += 'Und aktuell existieren keine vorherigen Sitzungen, die wieder aufgebaut werden können.';
        err += 'Versuchen Sie es später noch einmal!';
      }
      return throwError( err );
    }
    return this.http.post<AuthResponseData>(
      loginUrl,
      {
        email,
        password,
        returnSecureToken: true,
        clientDeviceId: this.getClientDeviceId()
      }
    )
      .pipe(
        catchError(this.handleError),
        tap(resData => {
          console.log('AuthService.login', {resData});
          this.handleAuthentication(
            email,
            resData.auth_identifier,
            resData.access_token,
            +resData.expires_in,
            +resData.clientDeviceId,
            pwHashB64
          );
        })
      );
  }

  private handleAuthentication(
    email: string,
    userId: number,
    token: string,
    expiresIn: number,
    clientDeviceId: number,
    pwHash: string
  ) {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    this.user = new User(email, userId, token, expirationDate, pwHash);
    const previousUser = this.baseData.getCurrentUser();
    if (previousUser) {
      this.baseData.setPreviousUser( previousUser );
    }
    this.setUserData( this.user );
    this.setClientDeviceId( clientDeviceId );
    this.connection.setAuthState(true);
    this.connection.refresh();
  }

  private setUserData(userData: User): void {
    this.baseData.setCurrentUser( this.user );
    localStorage.setItem('userData', JSON.stringify(userData));
  }

  public setClientDeviceId(devid: number): void {
    this.baseData.setCurrentDevice( devid );
  }

  public getClientDeviceId(): number {
    return this.baseData.getCurrentDeviceId() || 0;
  }

  public getUser(): User | null {
    if (this.user instanceof User) {
      return this.user;
    }

    const userData = JSON.parse( localStorage.getItem('userData') );

    if (userData &&
      ('email' in userData) &&
      ('id' in userData) &&
      ('uToken' in userData) &&
      ('uTokenExpirationDate' in userData) &&
      ('pwHash' in userData)) {
      return new User(userData.email, userData.id, userData.uToken, userData.uTokenExpirationDate, userData.pwHash);
    }

    return null;
  }

  public getUserToken(): string {
    if (this.user instanceof User) {
      return this.user.token;
    }
    return '';
  }

  private handleError(errorRes: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (!errorRes.error || !errorRes.error.error) {
      return throwError(errorMessage);
    }
    switch (errorRes.error.error.message) {
      case 'EMAIL_EXISTS':
        errorMessage = 'This email exists already';
        break;
      case 'EMAIL_NOT_FOUND':
        errorMessage = 'This email does not exist.';
        break;
      case 'INVALID_PASSWORD':
        errorMessage = 'This password is not correct.';
        break;
    }
    return throwError(errorMessage);
  }
}
