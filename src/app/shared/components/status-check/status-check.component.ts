import {Component, OnDestroy, OnInit} from '@angular/core';
import {ConnectionState, ConnectionService} from '../../services/connection-service.service';
import {Subscription} from 'rxjs';
import {DataService} from '../../services/data.service';
import {DBSyncClientService} from '../../services/dbsync-client.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-status-check',
  templateUrl: './status-check.component.html',
  styleUrls: ['./status-check.component.scss']
})
export class StatusCheckComponent implements OnInit, OnDestroy {

  currentState: ConnectionState;
  connectionSubscription: Subscription;
  unsyncedAmountChangeSubscription: Subscription;
  numUnsynced: number;
  currentApplicationVersion = environment.appVersion;

  constructor(
    private connectionService: ConnectionService,
    private dataService: DataService,
    private syncService: DBSyncClientService) {
    this.numUnsynced = -1;
  }

  ngOnInit() {
    this.syncService.numUnsyncedChangeLogs().then( (amount) => {
      this.numUnsynced = amount;
    });

    this.connectionSubscription = this.connectionService.monitor().subscribe((currentState: ConnectionState) => {
      console.log(currentState);
      this.currentState = currentState;
    });

    this.unsyncedAmountChangeSubscription = this.dataService.clientSyncAmountChanged
      .subscribe( (amount) => {
        this.numUnsynced = amount;
      });
  }

  ngOnDestroy() {
    this.connectionSubscription.unsubscribe();
    this.unsyncedAmountChangeSubscription.unsubscribe();
  }


}
