import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { ClientModel   } from '../inventory/models/client.model';
import { BuildingModel } from '../inventory/models/building.model';
import { DataService   } from '../inventory/service/data.service';
import {EventService} from '../event.service';
import {NgForm} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-select-inventory',
  templateUrl: './select-inventory.component.html',
  styleUrls: ['./select-inventory.component.scss']
})
export class SelectInventoryComponent implements OnInit, OnDestroy {

  @ViewChild('f', {static: false })
  selectForm: NgForm;

  private totalElements = 300;
  private doneElements = 50;

  private client: ClientModel;
  private building: BuildingModel;

  private clients: ClientModel[];
  private buildings: BuildingModel[];

  private routingSubscription: any;

  constructor(
    private dataService: DataService,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router) {}

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

    this.routingSubscription = this.route.params.subscribe(params => {
      console.log({params});
    });
  }

  ngOnDestroy() {
    this.routingSubscription.unsubscribe();
  }

  clientChanged(clientIdx) {
    this.client = this.clients[ clientIdx];
    console.log('client changed to ', { clientIdx, this_clients: this.clients, this_client: this.client});
    this.buildings = this.dataService.getBuildingList( this.client.mid );
    // this.client = clientID;
  }

  onSubmit() {
    console.log( this.selectForm );

    // Simple Way to navigate
    this.router.navigateByUrl( '/form-inventory');

    // More Control for navigate
    this.router.navigate( [
      '/form-inventory', this.client.mid, this.building.gid
    ]);
  }

  buildingChanged(buildingListIdx: number) {
    this.building = this.buildings[ buildingListIdx ];
  }

}
