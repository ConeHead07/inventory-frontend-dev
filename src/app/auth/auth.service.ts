import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import * as CryptoJS from 'crypto-js';

import { User } from './user.model';
import {BasedataService} from '../basedata.service';
import {WordArray} from 'crypto-js';

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

  private url = ':8040/auth/login/';

  constructor(private http: HttpClient, private router: Router, private baseData: BasedataService) {
    console.log('#29 AuthService.constructor', 'this.url: ', this.url);
    const originDomain = (window && window.location && window.location.origin)
      ? window.location.origin.split(':').slice(0, 2).join(':')
      : 'http://127.0.0.1';

    this.url = originDomain + this.url;
    console.log('#34 AuthService.constructor', {originDomain}, 'this.url: ', this.url);
  }

  logout() {
    this.baseData.setCurrentUser( null );
  }

  login(email: string, password: string) {
    console.log('#37 AuthService.login', {email, password}, 'this.url: ', this.url);
    const pwSalt = 'Inventory';
    const pwHash = CryptoJS.SHA3( pwSalt + password );

    return this.http.post<AuthResponseData>(
      this.url,
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
            pwHash
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
    pwHash: WordArray
  ) {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    this.user = new User(email, userId, token, expirationDate, pwHash);
    const previousUser = this.baseData.getCurrentUser();
    if (previousUser) {
      this.baseData.setPreviousUser( previousUser );
    }
    this.setUserData( this.user );
    this.setClientDeviceId( clientDeviceId );
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

    if (userData && ('email' in userData) && ('id' in userData) && ('uToken' in userData) && ('uTokenExpirationDate' in userData)) {
      return new User(userData.email, userData.id, userData.uToken, userData.uTokenExpirationDate);
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
