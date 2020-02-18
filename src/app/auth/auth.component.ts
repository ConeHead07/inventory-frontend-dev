import { Component, OnInit, Input } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {AuthResponseData, AuthService} from "./auth.service";
import {Observable} from "rxjs";
import {Router} from "@angular/router";

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  isLoading = false;
  error: string = null;

  @Input() username: string;
  @Input() password: string;

  public form = {
    email: null,
    password: null,
  }

  constructor(private authService: AuthService, private router: Router) {
  }

  ngOnInit() {
  }

  onLoginSubmit() {
    console.log('onLoginSubmit', this.form);

    let authObs: Observable<AuthResponseData>;

    let url = '';
    const email = this.form.email;
    const password = this.form.password;
    url = 'http://127.0.0.1:8040/auth/login/';

    authObs = this.authService.login(email, password);

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
  }

}
