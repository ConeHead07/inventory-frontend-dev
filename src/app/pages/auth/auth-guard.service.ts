import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(
    public auth: AuthService,
    public router: Router
  ) {}
  canActivate(): boolean {
    const isLoggedIn = this.auth.isLoggedIn();
    if (!this.auth.isLoggedIn()) {
       console.log('#16 AuthGuardService navigate to auth', { isLoggedIn });
       this.router.navigate(['auth']);
       return false;
    }
    return true;
  }
}
