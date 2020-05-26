import { Component, OnInit } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import { faCog } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-ngbheader',
  templateUrl: './ngbheader.component.html',
  styleUrls: ['./ngbheader.component.scss']
})
export class NgbheaderComponent {
  collapsed = true;
  faCog = faCog;

  constructor(private http: HttpClient) {}

  mkRequest() {
    const originDomain = (window && window.location && window.location.origin)
      ? window.location.origin.split(':').slice(0, 2).join(':')
      : 'http://127.0.0.1';

    this.http.get(originDomain + ':8040/auth/me').subscribe( (data) => console.log(data) );
  }
}
