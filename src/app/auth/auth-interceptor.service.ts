import { Injectable } from '@angular/core';

import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpParams,
  HttpEvent
} from '@angular/common/http';

import { Observable } from 'rxjs';
import { take, exhaustMap } from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptorService implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const user = this.authService.getUser();
    if (!user) {
      return next.handle(req);
    }

    const modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`,
        'Client-Device-Id': `${this.authService.getClientDeviceId()}`
      }
    });

    return next.handle(modifiedReq);
  }
}
