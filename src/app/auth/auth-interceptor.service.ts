import { Injectable } from '@angular/core';

import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpParams,
  HttpEvent
} from '@angular/common/http';

import {Observable, throwError} from 'rxjs';
import {take, exhaustMap, catchError} from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptorService implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
    const user = this.authService.getUser();
    if (!user) {
      return request;
    }

    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`,
        'Client-Device-Id': `${this.authService.getClientDeviceId()}`
      }
    });
  }

  private handleResponseError(error, request?, next?): Observable<never> {
    // Business error
    if (error.status === 400) {
      // Show message
    } else if (error.status === 401) {
      console.error('Login ist abgelaufen. Bitte neu einloggen!');
    }

    return throwError(error);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // Handle Request
    const request = this.addAuthHeader(req);

    // Handle Response
    return next.handle(request).pipe(
      catchError((error, caught) => {
        return this.handleResponseError(error, request, next);
    }));
  }
}
