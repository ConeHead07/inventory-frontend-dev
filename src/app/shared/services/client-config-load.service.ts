import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Environment } from '../model/Environment';
import { map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientConfigLoadService {


  static initializeClientConfig = (appConfig: ClientConfigLoadService) => {
    return () => {
      return appConfig.localClientConfig();
    };
  }

  constructor(private http: HttpClient) { }

  private localClientConfig(): Promise<boolean> {
    return this.http.get<any>('assets/client-config.local.json').toPromise()
      .then( (config) => {
        if (typeof config !== 'object') {
          return false;
        }

        if ('ApiUrl' in config && 'string' === typeof config.ApiUrl && config.ApiUrl ) {
          localStorage.setItem('currentApiBaseUrl', JSON.stringify( config.ApiUrl ) );
        }

        for (const key of config) {
          if (config.hasOwnProperty(key)) {
            localStorage.setItem(key, JSON.stringify( config.ApiUrl ) );
          }
        }
        return true;
      })
      .catch( (err) => {
        console.error(err);
        return false;
      });
  }
}
