import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiBaseUrl = ':8040/';

  constructor(private http: HttpClient) {
    const originDomain = (window && window.location && window.location.origin)
      ? window.location.origin.split(':').slice(0, 2).join(':')
      : 'http://127.0.0.1';

    this.apiBaseUrl = originDomain + this.apiBaseUrl;
  }

  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  private getUrl( url: string ): string {
    if ( url.substr(0, 10).match(/^[a-zA-Z]:\/\//)) {
      return url;
    }
    return this.apiBaseUrl + url;
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
