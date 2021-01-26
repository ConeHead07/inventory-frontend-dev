import { Component, OnInit } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import {ApiService} from "../api.service";

@Component({
  selector: 'app-ngbheader',
  templateUrl: './ngbheader.component.html',
  styleUrls: ['./ngbheader.component.scss']
})
export class NgbheaderComponent {
  collapsed = true;
  faCog = faCog;

  constructor(private http: HttpClient, private apiService: ApiService) {}

  mkRequest() {
    const url = this.apiService.getUrlByPath('auth/me');
    this.http.get(url).subscribe( (data) => console.log(data) );
  }

  continueLastInventory() {
    //  routerLink="/form-inventory"
  }
}
