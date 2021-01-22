import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import { ConnectionService } from './connection-service.service';
import {SwPush, SwUpdate} from "@angular/service-worker";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

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

  setupUpdates() {
    this.swUpdate.available.subscribe(u => {
      // Update wurde entdeckt

      // Update herunterladen
      this.swUpdate.activateUpdate().then(e => {
        // Update wurde heruntergeladen

        const message = 'Application has been updated';
        const action = 'Ok, Reload!';

        // Benutzer auf Update hinweisen und Seite neu laden
        this.toastr.info(message, action).onAction.subscribe(
          () => location.reload()
        );
      });
    });

    // Auf Updates prüfen
    this.swUpdate.checkForUpdate();
  }

  setupPush() {
    return; // Noch nicht aktiv
    const key = 'BBc7Bb5f5...';

    this.swPush.requestSubscription({
      serverPublicKey: key
    })
      .then(sub => {
          console.debug('Push Subscription', JSON.stringify(sub) );
        },
        err => {
          console.error('error registering for push', err);
        });
  }
}
