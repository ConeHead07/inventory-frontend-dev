import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {BasedataService} from './basedata.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiBaseUrl = '';

  constructor(private http: HttpClient, private baseData: BasedataService) {
    this.apiBaseUrl = this.baseData.getCurrentApiBaseUrlOrSetDefault( this.getDefaultApiUrl );
  }

  getDefaultApiUrl(): string {
    const hostName = window.location.hostname;
    let defaultUrl = '';

    const rgx = /(demo-)(.*?)(-app)(.mertens.services)/;
    if (rgx.test(hostName)) {
      defaultUrl = 'https://' + hostName.replace(rgx, '$1$2-admin$4') + '/';
      console.log('ApiService #24 getDefaultApiUrl()', { hostName, defaultUrl });
      return defaultUrl;
    }

    switch (hostName) {
      case 'inventory.local':
      case '127.0.0.1':
      case 'localhost':
        defaultUrl = 'https://' + hostName + ':8040/';
        break;

      case 'mertens-inventory-client.bluebirdapp.de':
        defaultUrl = 'https://mertens-inventory.bluebirdapp.de/';
        break;

      case 'demo-rheinenergie-app.mertens.services':
      case 'demo-apo-app.mertens.services':
      case 'demo-pc-app.mertens.services':
        defaultUrl = 'https://' + hostName.replace('-app.mertens.services', '-admin.mertens.services') + '/';
        break;

      case 'dev-inventory-app.mertens.services':
        defaultUrl = 'https://dev-inventory.mertens.services/';
        break;

      case 'mertens-inventory.firebaseapp.com':
      case 'mertens-inventory.web.app':
      default:
        defaultUrl = 'https://inventory.mertens.services/';
    }
    console.log('ApiService #50 getDefaultApiUrl()', { hostName, defaultUrl });
    return defaultUrl;
  }

  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  getUrlByPath(path: string) {
    while (path.startsWith('/')) {
      path = path.substr(1);
    }
    return this.apiBaseUrl + path;
  }

  getHealthPingUrl(): string {
    return this.getUrlByPath('assets/ping.json');
  }

  getConnectedPingUrl(): string {
    return this.getUrlByPath('auth/connected');
  }

  private getUrl( url: string ): string {
    if ( url.substr(0, 10).match(/^[a-zA-Z]:\/\//)) {
      return url;
    }
    return this.getUrlByPath(url);
  }

  get<T>(path: string, options?: object): Observable<T> {
    return this.http.get<T>(
      this.getUrl( path ),
      options
    );
  }

  post<T>(path: string, body: any | null, options?: object): Observable<T> {
    return this.http.post<T>(
      this.getUrl( path ),
      body,
      options
    );
  }

  put<T>(path: string, body: any | null, options?: object): Observable<T> {
    return this.http.put<T>(
      this.getUrl( path ),
      body,
      options
    );
  }

}
