import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DataService} from '../inventory/service/data.service';
import {ClientModel} from '../inventory/models/client.model';
import {BuildingModel} from '../inventory/models/building.model';
import {RoomModel} from '../inventory/models/room.model';
import {InventarModel} from '../inventory/models/inventar.model';


interface RaumStatus {
  hasTotal: boolean;
  total: number;
  numDone: number;
}

@Component({
  selector: 'app-invent-form',
  templateUrl: './invent-form.component.html',
  styleUrls: ['./invent-form.component.scss']
})
export class InventFormComponent implements OnInit, OnDestroy {

  public kunde?: ClientModel;
  public gebaeude?: BuildingModel;
  public raum?: RoomModel;

  public invObject: InventarModel;
  public raumStatus: RaumStatus;

  private clientID: number;
  private buildingID: number;
  private routingSubscription: any;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService) {}

  ngOnInit() {
    this.routingSubscription = this.route.params.subscribe(params => {
      this.clientID = parseInt( params.clientid,  10 );
      this.buildingID = parseInt( params.buildingid, 10 );

      this.kunde = this.dataService.getClient( this.clientID );
      this.gebaeude = this.dataService.getBuilding( this.buildingID, this.clientID );
      console.log({params, kunde: this.kunde, gebaeude: this.gebaeude });
    });
  }

  get kundeName(): string {
    return this.kunde ? this.kunde.Mandant : '';
  }

  get adresse(): string {
    return this.gebaeude ? this.gebaeude.Gebaeude : '';
  }

  get raumNr(): string {
    return this.raum ? this.raum.Raum : '';
  }

  ngOnDestroy(): void {
    this.routingSubscription.unsubscribe();
  }

}
