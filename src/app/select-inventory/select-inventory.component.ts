import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { DataService   } from '../inventory/service/data.service';
import {EventService} from '../event.service';
import {NgForm} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {DBDIGebaeude, DBDIInventuren, DBDIMandanten} from '../dexie.service';
import {AuthService} from '../auth/auth.service';
import {BasedataService} from '../basedata.service';
import {InventoryProgress, InventoryProgressService} from '../inventory-progress.service';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import {ConnectionService as NgConnectionService } from 'ng-connection-service';
import {ConnectionService, ConnectionState} from '../connection-service.service';

enum StatusLoadingInventories {
  None,
  WaitingForNetwork,
  WaitingForServerAccess,
  Pending,
  Loading,
  FinishedSuccessful,
  Failure
}

@Component({
  selector: 'app-select-inventory',
  templateUrl: './select-inventory.component.html',
  styleUrls: ['./select-inventory.component.scss']
})
export class SelectInventoryComponent implements OnInit, OnDestroy {

  @ViewChild('f', {static: false })
  selectForm: NgForm;

  faSyncIcon = faSyncAlt;
  ngHasConnection = false;
  hasConnection = false;
  hasServerConnection = false;

  public status = '';
  public statusLoadingUserInventories = StatusLoadingInventories.None;
  public loadedUserInventories = false;

  private totalElements = 0;
  private doneElements = 0;

  private jobid?: number;
  private inventory?: DBDIInventuren;
  private client: DBDIMandanten;
  private building: DBDIGebaeude;

  private clients: DBDIMandanten[];
  private buildings: DBDIGebaeude[];

  private routingSubscription: any;

  private inventories: DBDIInventuren[];

  constructor(
    private dataService: DataService,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private baseData: BasedataService,
    private progressService: InventoryProgressService,
    private connection: ConnectionService,
    private ngConnection: NgConnectionService) {
  }

  get progressAmount(): number {
    if (typeof this.doneElements !== 'number' || this.doneElements <= 0) {
      return 0;
    }
    if (typeof this.totalElements !== 'number') {
      return 0;
    }
    const done = this.doneElements;
    const total = this.totalElements;
    return total > 0 ? Math.round((done * 1000) / total) / 10 : 0;
  }


  ngOnInit() {
    this.routingSubscription = this.route.params.subscribe(params => {
      console.log({params});
    });

    this.ngConnection.monitor().subscribe( (hasConn: boolean) => {
      this.ngHasConnection = hasConn;
    });
    this.hasConnection = this.connection.hasInternetAccess;
    this.hasServerConnection = this.connection.hasInternetAccess;
    this.connection.monitor().subscribe( (conn: ConnectionState) => {
      this.hasConnection = conn.hasNetworkConnection;
      this.hasServerConnection = conn.hasInternetAccess;

      if (this.statusLoadingUserInventories < StatusLoadingInventories.FinishedSuccessful) {
        this.checkLoadUserInventories();
      }
    });


  }

  public checkLoadUserInventories() {
    const stat = this.statusLoadingUserInventories;
    if (stat < StatusLoadingInventories.FinishedSuccessful) {
      if (stat < StatusLoadingInventories.Pending) {
        if (!this.hasConnection) {
          this.statusLoadingUserInventories = StatusLoadingInventories.WaitingForNetwork;
          return;
        }
        if (!this.hasServerConnection) {
          this.statusLoadingUserInventories = StatusLoadingInventories.WaitingForServerAccess;
          return;
        }
        this.statusLoadingUserInventories = StatusLoadingInventories.Pending;
        this.loadUserInventories().then( (success) => {
          this.statusLoadingUserInventories = success
            ? StatusLoadingInventories.FinishedSuccessful
            : StatusLoadingInventories.Failure;
        }).catch( (err) => {
          this.statusLoadingUserInventories = StatusLoadingInventories.Failure;
          this.status = JSON.stringify( err );
        });
      }
    }
  }

  public async loadUserInventories(): Promise<boolean> {
    console.log('ngOnInit select-iventory.components.ts');
    const uid = this.auth.getUser().id;
    const mid = this.baseData.getCurrentMid() || 0;
    const gid = this.baseData.getCurrentGid() || 0;

    return await this.dataService.getUserAssignedInventories( uid )
      .then( (result) => {
        console.log({ called: 'this.dataService.getUserAssignedInventories', result});
        this.inventories = result;
        const aMids = this.inventories.map<number>( (itm) => itm.mid );
        console.log( 'ngOnInit', { uid, aMids });

        return this.dataService.getClientList()
          .then( (mandanten: DBDIMandanten[]) => {
            this.clients = mandanten.filter( (itm) => aMids.indexOf( itm.mid ) !== -1 );
            return this.clients;
          })
          .then( clientList => {
            this.setDefaultSelection(mid, gid);
            return true;
          })
          .catch( (err) => {
            this.status = JSON.stringify(err);
            return false;
          });
      })
      .catch( (err) => {
        this.status = JSON.stringify(err);
        return false;
      });
  }

  public setDefaultSelection(mid: number, gid?: null|number) {
    const clientListIdx = this.getClientListIdxByMid(mid);
    if (-1 !== clientListIdx) {
      const clientChanged = this.clientChanged( clientListIdx);
      if (gid) {
        clientChanged.then( (success) => {
          if (!success) {
            return false;
          }
          const buildingsListIdx = this.getBuildingListIdxByGid(gid);
          this.buildingChanged(buildingsListIdx);
        });
      }
    }
  }

  private getClientListIdxByMid(mid: number): number {
    if (!mid) {
      return -1;
    }
    for (let i = 0; i < this.clients.length; i++) {
      if (this.clients[i].mid === mid) {
        return i;
      }
    }
    return -1;
  }

  private getBuildingListIdxByGid(gid: number): number {
    if (!gid) {
      return -1;
    }
    for (let i = 0; i < this.buildings.length; i++) {
      if (this.buildings[i].mid === gid) {
        return i;
      }
    }
    return -1;
  }

  ngOnDestroy() {
    this.routingSubscription.unsubscribe();
  }

  async clientChanged(clientIdx) {
    this.client = this.clients[ clientIdx];
    console.log('client changed to ', { clientIdx, this_clients: this.clients, this_client: this.client});
    this.buildings = await this.dataService.getBuildingList( this.client.mid );
    console.log( 'assign selection buildings: ', this.buildings );
    return true;
  }

  async onSubmit() {
    console.log( this.selectForm );
    this.status = 'Lade Inventarisierungsdaten vom Server';
    await this.dataService.loadInventurDataByInventurId(1);
    this.status = '';

    // Simple Way to navigate
    if (0) {
      this.router.navigateByUrl( '/form-inventory');
    }

    for (const inventory of this.inventories) {
      if (inventory.mid === this.client.mid && inventory.gid === this.building.gid) {
        this.jobid = inventory.jobid;
        this.inventory = inventory;
        this.baseData.setCurrentInventur( inventory );
        this.baseData.setCurrentGebaeude( this.building );
        // More Control for navigate
        this.router.navigate( [
          '/form-inventory', this.client.mid, this.building.gid
        ]);
        return true;
      }
    }
    return false;
  }

  buildingChanged(buildingListIdx: number) {
    this.building = this.buildings[ buildingListIdx ];

    this.progressService.getCurrentGebaeudeProgress().then( (progress: InventoryProgress) => {
      this.totalElements = progress.total;
      this.doneElements = progress.done;
    });
  }

}
