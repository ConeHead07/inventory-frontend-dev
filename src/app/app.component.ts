import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import { ConnectionService } from './connection-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  heartBeatState;

  constructor(private connectionService: ConnectionService) {
    this.heartBeatState = this.connectionService.options.enableHeartbeat;
  }

  setHeartBeatState(state: boolean) {
    this.heartBeatState = state;
    this.connectionService.updateOptions({enableHeartbeat: state});
  }
}
