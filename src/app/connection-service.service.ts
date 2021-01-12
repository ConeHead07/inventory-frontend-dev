import {EventEmitter, Inject, Injectable, InjectionToken, OnDestroy, Optional} from '@angular/core';
import {fromEvent, Observable, Subscription, timer} from 'rxjs';
import {debounceTime, delay, retryWhen, startWith, switchMap, tap} from 'rxjs/operators';
import * as _ from 'lodash';
import { HttpClient } from '@angular/common/http';
import {ApiService} from './api.service';

/**
 * Instance of this interface is used to report current connection status.
 */
export interface ConnectionState {
  /**
   * "True" if browser has network connection. Determined by Window objects "online" / "offline" events.
   */
  hasNetworkConnection: boolean;
  /**
   * "True" if browser has Internet access. Determined by heartbeat system which periodically makes request to heartbeat Url.
   */
  hasServerAccess: boolean;

  hasValidSession: boolean;
}

/**
 * Instance of this interface could be used to configure "ConnectionService".
 */
export interface ConnectionServiceOptions {
  /**
   * Controls the Internet connectivity heartbeat system. Default value is 'true'.
   */
  enableHeartbeat?: boolean;
  /**
   * Url used for checking Internet connectivity, heartbeat system periodically makes "HEAD" requests to this URL to determine Internet
   * connection status. Default value is "//internethealthtest.org".
   */
  heartbeatUrl?: string;
  /**
   * Interval used to check Internet connectivity specified in milliseconds. Default value is "30000".
   */
  heartbeatInterval?: number;
  /**
   * Interval used to retry Internet connectivity checks when an error is detected (when no Internet connection). Default value is "1000".
   */
  heartbeatRetryInterval?: number;
  /**
   * HTTP method used for requesting heartbeat Url. Default is 'head'.
   */
  requestMethod?: 'get' | 'post' | 'head' | 'options';

  responseType?: string;

}

/**
 * InjectionToken for specifing ConnectionService options.
 */
export const ConnectionServiceOptionsToken: InjectionToken<ConnectionServiceOptions> = new InjectionToken('ConnectionServiceOptionsToken');

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private static DEFAULT_OPTIONS: ConnectionServiceOptions = {
    enableHeartbeat: true,
    heartbeatUrl: '/auth/heartbeat',
    heartbeatInterval: 120000,
    heartbeatRetryInterval: 60000,
    requestMethod: 'get',
    responseType: 'text'
  };

  private stateChangeEventEmitter = new EventEmitter<ConnectionState>();

  private currentState: ConnectionState = {
    hasServerAccess: false,
    hasValidSession: false,
    hasNetworkConnection: window.navigator.onLine
  };
  private offlineSubscription: Subscription;
  private onlineSubscription: Subscription;
  private httpSubscription: Subscription;
  private sessionStateSubscription: Subscription;
  private serviceOptions: ConnectionServiceOptions;

  /**
   * Current ConnectionService options. Notice that changing values of the returned object has not effect on service execution.
   * You should use "updateOptions" function.
   */
  get options(): ConnectionServiceOptions {
    return _.clone(this.serviceOptions);
  }

  constructor(private http: HttpClient,
              @Inject(ConnectionServiceOptionsToken)
              @Optional()
                options: ConnectionServiceOptions,
              private apiService: ApiService) {
    this.serviceOptions = _.defaults({}, options, ConnectionService.DEFAULT_OPTIONS);

    this.checkNetworkState();
    this.checkInternetState();
    // this.checkAuthenticationState();
  }

  private checkInternetState() {

    if (!_.isNil(this.httpSubscription)) {
      this.httpSubscription.unsubscribe();
    }
    const method = this.serviceOptions.requestMethod;
    const heartBeatPath = this.serviceOptions.heartbeatUrl;

    if (this.serviceOptions.enableHeartbeat) {
      this.httpSubscription = timer(0, this.serviceOptions.heartbeatInterval)
        .pipe(
          switchMap(() => this.apiService[method]<ArrayBuffer>(heartBeatPath, {responseType: 'text'})),
          retryWhen(errors =>
            errors.pipe(
              // log error message
              tap(val => {
                console.error('Http error:', val);
                const lastAccess = this.currentState.hasServerAccess;
                this.currentState.hasServerAccess = false;
                if (lastAccess !== false) {
                  this.emitEvent();
                }
              }),
              // restart after 5 seconds
              delay(this.serviceOptions.heartbeatRetryInterval)
            )
          )
        )
        .subscribe(result => {
          const lastAccess = this.currentState.hasServerAccess;
          const lastSession = this.currentState.hasValidSession;
          this.currentState.hasServerAccess = true;
          if (result && typeof result === 'string' && result.match(/"connected"\s*:\s*true/)) {
            this.currentState.hasValidSession = true;
          }
          if (lastAccess !== true
          || !lastSession && this.currentState.hasValidSession) {
            this.emitEvent();
          }
        });
    } else {
      const lastAccess = this.currentState.hasServerAccess;
      this.currentState.hasServerAccess = false;
      if (lastAccess !== false) {
        this.emitEvent();
      }
    }
  }

  private checkNetworkState() {
    this.onlineSubscription = fromEvent(window, 'online').subscribe(() => {
      this.currentState.hasNetworkConnection = true;
      this.checkInternetState();
      this.checkAuthenticationState();
      this.emitEvent();
    });

    this.offlineSubscription = fromEvent(window, 'offline').subscribe(() => {
      this.currentState.hasNetworkConnection = false;
      this.checkInternetState();
      this.emitEvent();
    });
  }

  private checkAuthenticationState() {
    const authPingUrl = this.apiService.getConnectedPingUrl();
    console.log('ConnectionService.checkAuthenticationState #164', authPingUrl);

    if (!_.isNil(this.sessionStateSubscription)) {
      this.sessionStateSubscription.unsubscribe();
    }

    if (this.serviceOptions.enableHeartbeat) {
      this.sessionStateSubscription = timer(0, this.serviceOptions.heartbeatInterval)
        .pipe(
          switchMap(() => this.http[this.serviceOptions.requestMethod](authPingUrl, {responseType: 'text'})),
          retryWhen(errors =>
            errors.pipe(
              // log error message
              tap(val => {
                console.log('ConnectionService.checkAuthenticationState #178', authPingUrl);
                console.error('Http error:', val);
                const lastSessionState = this.currentState.hasValidSession;
                this.currentState.hasValidSession = false;
                if (lastSessionState !== false) {
                  this.emitEvent();
                }
              }),
              // restart after 5 seconds
              delay(this.serviceOptions.heartbeatRetryInterval)
            )
          )
        )
        .subscribe(result => {
          console.log('ConnectionService.checkAuthenticationState #186 subscribe result', { resultType: typeof result, result });
          const jsonResult = typeof result === 'string' ? JSON.parse(result) : result;
          const lastSessionState = this.currentState.hasValidSession;
          this.currentState.hasValidSession = 'connected' in jsonResult && jsonResult.connected === true;
          if (lastSessionState !== true) {
            this.emitEvent();
          }
        });
    } else {
      const lastSessionState = this.currentState.hasValidSession;
      this.currentState.hasValidSession = false;
      if (lastSessionState !== false) {
        this.emitEvent();
      }
    }
  }

  private emitEvent() {
    this.stateChangeEventEmitter.emit(this.currentState);
  }

  ngOnDestroy(): void {
    try {
      this.offlineSubscription.unsubscribe();
      this.onlineSubscription.unsubscribe();
      this.httpSubscription.unsubscribe();
    } catch (e) {
    }
  }

  /**
   * Monitor Network & Internet connection status by subscribing to this observer. If you set "reportCurrentState" to "false" then
   * function will not report current status of the connections when initially subscribed.
   * @param reportCurrentState Report current state when initial subscription. Default is "true"
   */
  monitor(reportCurrentState = true): Observable<ConnectionState> {
    return reportCurrentState ?
      this.stateChangeEventEmitter.pipe(
        debounceTime(300),
        startWith(this.currentState),
      )
      :
      this.stateChangeEventEmitter.pipe(
        debounceTime(300)
      );
  }

  /**
   * Update options of the service. You could specify partial options object. Values that are not specified will use default / previous
   * option values.
   * @param options Partial option values.
   */
  updateOptions(options: Partial<ConnectionServiceOptions>) {
    this.serviceOptions = _.defaults({}, options, this.serviceOptions);
    this.checkInternetState();
  }

  getCurrentState() {
    return this.currentState;
  }

  get hasServerAccess() {
    return this.currentState.hasServerAccess;
  }

  get hasNetworkConnection() {
    return this.currentState.hasNetworkConnection;
  }

}
