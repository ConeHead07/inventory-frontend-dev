import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BasedataService} from "./basedata.service";
import {ApiService} from "./api.service";

@Injectable({
  providedIn: 'root'
})
export class ClientConfigLoadService {

  static initializeClientConfig = (appConfig: ClientConfigLoadService) => {
    return () => {
      return appConfig.localClientConfig();
    };
  }

  constructor(
    private http: HttpClient,
    private baseData: BasedataService,
    private apiService: ApiService) {}

  private localClientConfig(): Promise<boolean> {
    return this.http.get<any>('assets/client-config.local.json').toPromise()
      .then( (config) => {
        if (typeof config !== 'object') {
          return false;
        }

        for (const key in config) {
          if (config.hasOwnProperty(key)) {
            localStorage.setItem(key, JSON.stringify( config[key] ) );
          }
        }

        if ('ApiUrl' in config && 'string' === typeof config.ApiUrl && config.ApiUrl ) {
          localStorage.setItem('currentApiBaseUrl', JSON.stringify( config.ApiUrl ) );
          this.apiService.setBaseUrl(config.ApiUrl);
        }

        this.baseData.init();
        return true;
      })
      .catch( (err) => {
        console.error(err);
        return false;
      });
  }
}
