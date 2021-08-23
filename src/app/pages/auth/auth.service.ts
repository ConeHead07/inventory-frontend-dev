import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {catchError, tap } from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import * as CryptoJS from 'crypto-js';

import { User } from './user.model';
import {BasedataService} from '../../shared/services/basedata.service';
import {ConnectionService} from '../../shared/services/connection-service.service';
import {ApiService} from '../../shared/services/api.service';
import {UserService} from '../../shared/services/user.service';
// import { JwtHelperService } from '@auth0/angular-jwt';

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
  private pwSalt = 'Inventory';

  constructor(
    // public jwtHelper: JwtHelperService,
    private http: HttpClient,
    private router: Router,
    private connection: ConnectionService,
    private baseData: BasedataService,
    private userService: UserService,
    private apiService: ApiService) {
  }

  logout() {
    this.baseData.setCurrentUser( null );
    if (this.user) {
      this.user.isLoggedIn = false;
    }
    this.setUserData(this.user);
  }

  async login(email: string, password: string): Promise<any> {
    const loginUrl = this.apiService.getUrlByPath(this.authPath);
    const pwHash = this.getEncryptedPassword(password);
    const hasNetwork = this.connection.hasNetworkConnection;
    if (!this.connection.hasNetworkConnection) {
      const authenticatedUser = await this.getUserByAuth(email, pwHash, true);

      let err = 'Es besteht aktuell keine Serververbindung! ';

      if (!authenticatedUser) {
        console.error('AuthService.login offline: failed #65', { email, pwHash, hasNetwork });
        err += 'Email und Passwort stimmen nicht mit der letzten Live-Anmeldung überein!' + '<br>';
      } else {
        console.log('AuthService.login offline: successful #66', authenticatedUser.email);
        let expiresIn = 1000 * 60 * 60;
        if (authenticatedUser.expirationDate && authenticatedUser.expirationDate.getTime() > (Date.now() + expiresIn) ) {
          expiresIn = authenticatedUser.expirationDate.getTime() - Date.now();
        }
        this.handleAuthentication(
          email,
          authenticatedUser.id,
          authenticatedUser.token,
          expiresIn,
          +this.getClientDeviceId(),
          pwHash
        );
        return new Observable( (observer) => {
          observer.next(true);
          observer.complete();
        });
      }
      throw err;
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
          this.userService.put({
            id: resData.auth_identifier,
            name: email,
            email,
            password: pwHash,
            remember_token: resData.access_token,
            created_at: new Date()
          });
          this.handleAuthentication(
            email,
            resData.auth_identifier,
            resData.access_token,
            +resData.expires_in,
            +resData.clientDeviceId,
            pwHash
          );
        })
      ).toPromise();
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
    this.user.isLoggedIn = true;
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

  private async getUserByAuth(email: string, password: string, pwIsEncrypted: boolean): Promise<User|null> {
    const encPassword = pwIsEncrypted ? password : this.getEncryptedPassword(password);
    const userData = await this.userService.getByAuth(email, encPassword);
    console.log('AuthServer.getUserByAuth(', email, password, ') #161 encPassword:', encPassword , 'userData:', userData );
    if (userData) {
      const minExpirationTime = 1000 * 60 * 60 * 2;
      const expireDate = new Date( Date.now() + minExpirationTime );
      return new User(email, userData.id, userData.remember_token, expireDate, encPassword );
    }
    let lastUser = this.getUser();
    if (!lastUser) {
      lastUser = this.getPreviousUser();
    }
    if (lastUser.email === email && lastUser.pwHash === encPassword) {
      return lastUser;
    }
    return null;
  }

  private getUserData(): User {
    return this.getUserDataOfLocalStorage('userData');
  }

  private getPreviousUser(): User {
    return this.getUserDataOfLocalStorage('previousUser');
  }

  private getUserDataOfLocalStorage(itemName: string): User {
    const userDataString = localStorage.getItem(itemName);
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData && ('uTokenExpirationDate' in userData)) {
        userData.uTokenExpirationDate = new Date(userData.uTokenExpirationDate);
      }

      if (userData &&
        ('email' in userData) &&
        ('id' in userData) &&
        ('uToken' in userData) &&
        ('uTokenExpirationDate' in userData) &&
        ('pwHash' in userData)) {
        return new User(userData.email, userData.id, userData.uToken, userData.uTokenExpirationDate, userData.pwHash);
      }
    }
    return null;
  }

  public setClientDeviceId(devid: number): void {
    this.baseData.setCurrentDevice( devid );
  }

  public getClientDeviceId(): number {
    return this.baseData.getCurrentDeviceId() || 0;
  }

  public getUser(): User | null {
    return this.getUserData();
  }

  public getUserToken(): string {
    if (this.user instanceof User) {
      return this.user.token;
    }
    return '';
  }

  public isLoggedIn(): boolean {
    const user = this.getUser();
    const isLoggedIn = (user && (user instanceof User) && user.hasValidUiSession);
    if (!isLoggedIn) {
      console.log('app.pages.auth.auth.service.ts #187 user is not logged in: ', user);
    }
    return isLoggedIn;
  }

  public isAuthenticated(): boolean {
    if (!this.user || !(this.user instanceof User) || !this.user.token) {
      return false;
    }
    const token = this.user.token;

    return (this.user.expirationDate.getTime() <= Date.now());

    // Check whether the token is expired and return
    // true or false
    // return !this.jwtHelper.isTokenExpired(token);
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

  private getEncryptedPassword(password: string): string {
    const pwHash = CryptoJS.SHA3( this.pwSalt + password );
    return CryptoJS.enc.Base64.stringify(pwHash);
  }
}
