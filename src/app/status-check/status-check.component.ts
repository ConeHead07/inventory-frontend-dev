import {Component, OnDestroy, OnInit} from '@angular/core';
import {ConnectionState, ConnectionService} from './../connection-service.service';
import {Subscription} from "rxjs";

@Component({
  selector: 'app-status-check',
  templateUrl: './status-check.component.html',
  styleUrls: ['./status-check.component.scss']
})
export class StatusCheckComponent implements OnInit, OnDestroy {

  currentState: ConnectionState;
  connectionSubscription: Subscription;

  constructor(private connectionService: ConnectionService) {
  }

  ngOnInit() {
    this.connectionSubscription = this.connectionService.monitor().subscribe((currentState: ConnectionState) => {
      console.log(currentState);
      this.currentState = currentState;
    });
  }

  ngOnDestroy() {
    this.connectionSubscription.unsubscribe();
  }


}
