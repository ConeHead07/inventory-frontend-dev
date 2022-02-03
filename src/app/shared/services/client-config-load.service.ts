import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BasedataService} from './basedata.service';
import {ApiService} from './api.service';
import {VariablesService} from './variables.service';

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
    private apiService: ApiService,
    private variableService: VariablesService) {}

  private localClientConfig(): Promise<boolean> {
    return this.http.get<any>('assets/client-config.local.json').toPromise()
      .then( async (config) => {
        if (typeof config !== 'object') {
          return false;
        }

        await this.variableService.set('ClientConfig', config);

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

  public getClientConfig(mid: number, path: string = '', defaultVal?: any): Promise<any> {
    return this.variableService.get('ClientConfig').then( (config) => {

      const objectSearch = (obj, searchPath: string): any => {
        const parts = searchPath.split('.');
        if (typeof obj !== 'object') {
          return undefined;
        }
        if (! (parts[0] in obj) ) {
          return undefined;
        }
        if (parts.length === 1) {
          return obj[ parts[0] ];
        }
        return objectSearch(obj[ parts[0] ], parts.slice(1).join('.'));
      };
      const clientConfig = objectSearch(config, 'Clients.' + mid.toString(10));

      if (!(clientConfig && Object.keys(clientConfig).length > 0)) {
        return defaultVal;
      }

      if (path === '') {
        return clientConfig;
      }

      if (path.indexOf('.') === -1) {
        if (!(path in clientConfig)) {
          return defaultVal;
        }
        return clientConfig[path];
      }
      const result = objectSearch(clientConfig, path);

      if (result !== undefined) {
        return result;
      } else {
        return defaultVal;
      }
    });
  }
}
