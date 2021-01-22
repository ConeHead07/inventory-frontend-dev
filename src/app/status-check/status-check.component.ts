import {Component, OnDestroy, OnInit} from '@angular/core';
import {ConnectionState, ConnectionService} from './../connection-service.service';
import {Subscription} from "rxjs";
import {DataService} from "../inventory/service/data.service";
import {DBSyncClientService} from "../dbsync-client.service";

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
