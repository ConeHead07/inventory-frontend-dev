import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import { ConnectionService } from './connection-service.service';
import {SwPush, SwUpdate} from '@angular/service-worker';
import {ToastrService} from 'ngx-toastr';
import {environment} from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  currentApplicationVersion = environment.appVersion;
  readonly VAPID_PUBLIC_KEY = 'BG2ymYfILNZzi183knEsp5PkW8jaGhsMR0u1iAriOfRUjKrLuAQLE6oZf_TguLnBPDksMDE900zi_qnoqmjOE3Y';

  heartBeatState;

  constructor(private connectionService: ConnectionService,
              private toastr: ToastrService,
              private swUpdate: SwUpdate,
              private swPush: SwPush) {
    this.heartBeatState = this.connectionService.options.enableHeartbeat;

    if (this.swUpdate.isEnabled) {
      this.setupUpdates();
    }
    if (this.swPush.isEnabled) {
      this.setupPush();
    }
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

  setupPush() {

    this.swPush.requestSubscription({
      serverPublicKey: this.VAPID_PUBLIC_KEY
    })
      .then(sub => {
          console.log('Push Subscription', sub );
        },
        err => {
          console.error('error registering for push', err);
        });
  }
}
