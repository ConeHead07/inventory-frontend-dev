import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';

import { ConnectionService } from './shared/services/connection-service.service';
import {SwPush, SwUpdate} from '@angular/service-worker';
import {ToastrService} from 'ngx-toastr';
import {environment} from '../environments/environment';
import {NavigationEnd, Router} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  url = '';
  isLoginPage = false;
  currentApplicationVersion = environment.appVersion;
  readonly VAPID_PUBLIC_KEY = 'BG2ymYfILNZzi183knEsp5PkW8jaGhsMR0u1iAriOfRUjKrLuAQLE6oZf_TguLnBPDksMDE900zi_qnoqmjOE3Y';

  heartBeatState;
  deferredInstallPrompt: any;

  constructor(private connectionService: ConnectionService,
              private toastr: ToastrService,
              private router: Router,
              private swUpdate: SwUpdate,
              private swPush: SwPush) {
    this.heartBeatState = this.connectionService.options.enableHeartbeat;

    if (this.swUpdate.isEnabled) {
      this.setupUpdates();
    }

    this.router.events.subscribe( event => {
      if (event instanceof NavigationEnd) {
        console.log('router.event (NavigationEnd)', this.router.url, { event });
        this.url = (event as NavigationEnd).url;
        const rgxAuth = new RegExp('\/auth\\b');
        this.isLoginPage = rgxAuth.test(this.url);
      }
    });
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onPrompt(event: Event) {
    this.deferredInstallPrompt = event;
    return false;
  }

  setHeartBeatState(state: boolean) {
    this.heartBeatState = state;
    this.connectionService.updateOptions({enableHeartbeat: state});
  }
/*

        updates.available.subscribe(event => {
          console.log('current version is', event.current);
          console.log('available version is', event.available);
        });
        updates.activated.subscribe(event => {
          console.log('old version was', event.previous);
          console.log('new version is', event.current);
        });

        updates.available.subscribe(event => {
            updates.activateUpdate().then(() => this.updateApp());
        });
 */
  setupUpdates() {
    return;
    this.swUpdate.available.subscribe(event => {
      // Update wurde entdeckt
      console.log('current version is', event.current);
      console.log('available version is', event.available);

      const message = 'Aktuelle Version: ' + event.current + '<br>Aktuelle Version' + event.available;
      const action = 'New Version is available!';

      // Benutzer auf Update hinweisen und Seite neu laden
      this.toastr.info(message, action).onAction.subscribe(
        () => location.reload()
      );
    });

    // Update herunterladen
    this.swUpdate.activateUpdate().then(e => {
      // Update wurde heruntergeladen

      const message = 'Anwendung wurde aktualisert und wird neu geladen';
      const action = 'Reload!';

      // Benutzer auf Update hinweisen und Seite neu laden
      this.toastr.info(message, action).onAction.subscribe(
        () => location.reload()
      );
    });

    // Auf Updates prüfen
    this.swUpdate.checkForUpdate();
  }

  async setupPush() {

    const pushSubscription = await this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    })
      .then( (sub: PushSubscription) => {
          console.log('Push Subscription', sub );
        },
        (err: any) => {
          console.error('error registering for push', err);
        });
    console.log({pushSubscription});
  }

  installApp() {
    this.deferredInstallPrompt.prompt();
  }
}
