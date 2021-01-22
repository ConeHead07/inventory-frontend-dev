import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {BasedataService} from './basedata.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiBaseUrl = ':8040/';

  constructor(private http: HttpClient, private baseData: BasedataService) {
    console.log('ApiService.constructor #14');
    if (false) {
      const originDomain = (window && window.location && window.location.origin)
        ? window.location.origin.split(':').slice(0, 2).join(':')
        : 'http://127.0.0.1';

      this.apiBaseUrl = originDomain + this.apiBaseUrl;

      const realApiBaseUrl = this.apiBaseUrl;
      const debugApiBaseUrl = this.baseData.getCurrentApiBaseUrlOrSetDefault( this.getDefaultApiUrl );
      console.log({debugApiBaseUrl, realApiBaseUrl});
      return;
    }

    this.apiBaseUrl = this.baseData.getCurrentApiBaseUrlOrSetDefault( this.getDefaultApiUrl );
  }

  getDefaultApiUrl(): string {
    const url = (window.location.origin.indexOf('mertens-inventory') !== -1)
      ? 'https://mertens-inventory.bluebirdapp.de/'
      : 'https://' + window.location.hostname + ':8040/';
    console.log('ApiService.getDefaultApiUrl() return ', { url });
    return url;
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
