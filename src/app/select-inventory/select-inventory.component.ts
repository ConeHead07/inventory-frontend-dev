import {Component, OnInit, ViewChild} from '@angular/core';
import { ClientModel   } from '../inventory/models/client.model';
import { BuildingModel } from '../inventory/models/building.model';
import { DataService   } from '../inventory/service/data.service';
import {EventService} from '../event.service';
import {NgForm} from '@angular/forms';

@Component({
  selector: 'app-select-inventory',
  templateUrl: './select-inventory.component.html',
  styleUrls: ['./select-inventory.component.scss']
})
export class SelectInventoryComponent implements OnInit {

  @ViewChild('f', {static: false })
  selectForm: NgForm;

  private totalElements = 300;
  private doneElements = 50;

  private client: ClientModel;
  private building: BuildingModel;

  private clients: ClientModel[];
  private buildings: BuildingModel[];

  constructor(private dataService: DataService, private eventService: EventService) {}

  get progressAmount(): number {
    if (typeof this.doneElements !== 'number' || this.doneElements <= 0) {
      return 0;
    }
    if (typeof this.totalElements !== 'number') {
      return 0;
    }
    const done = this.doneElements;
    const total = this.totalElements;
    return Math.round((done * 1000) / total) / 10;
  }

  ngOnInit() {
    this.clients = this.dataService.getClientList();
  }

  clientChanged(clientIdx) {
    this.client = this.clients[ clientIdx];
    console.log('client changed to ', { clientIdx, this_clients: this.clients, this_client: this.client});
    this.buildings = this.dataService.getBuildingList( this.client.mid );
    // this.client = clientID;
  }

  onSubmit() {
    console.log( this.selectForm );
  }

  buildingChanged(building: BuildingModel) {
  }

}
