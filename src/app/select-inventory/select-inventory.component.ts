import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {DataService, TableLoadingStatus, TablesLoadingStatus} from '../inventory/service/data.service';
import {EventService} from '../event.service';
import {NgForm} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {DBDIGebaeude, DBDIInventuren, DBDIMandanten, DBDIRaeume} from '../dexie.interfaces';
import {AuthService} from '../auth/auth.service';
import {BasedataService} from '../basedata.service';
import {InventoryProgress, InventoryProgressService} from '../inventory-progress.service';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import {ConnectionService, ConnectionState} from '../connection-service.service';
import {Subscription} from 'rxjs';
import {DbsyncLogService, LoadingMetaData, LoadingMetaMessage} from '../dbsync-log.service';

enum StatusLoadingInventories {
  None,
  WaitingForNetwork,
  WaitingForServerAccess,
  Pending,
  Loading,
  FinishedSuccessful,
  Failure
}

interface LastInventoryDetails {
  jobid: number;
  mid: number;
  gid: number;
  Titel: string;
  Gebaeude: string;
  Mandant: string;
  routeParams: [number, number, string?];
  ruuid?: string;
  Etage?: string;
  Raum?: string;
  Raumbezeichnung?: string;
}

interface InventurIds {
  mid: number;
  jobid?: number;
  gid?: number;
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
  hasConnection = false;
  hasServerConnection = false;

  public status = '';
  public statusLoadingUserInventories = StatusLoadingInventories.None;
  public loadedUserInventories = false;

  totalElements = 0;
  doneElements = 0;

  private jobid?: number;
  inventory?: DBDIInventuren;
  client: DBDIMandanten;
  building: DBDIGebaeude;
  loading = false;

  clients: DBDIMandanten[];
  buildings: DBDIGebaeude[];

  private routingSubscription: any;

  inventories: DBDIInventuren[];
  private inventoriesSelectable: DBDIInventuren[];
  lastInventory: DBDIInventuren;
  lastBuilding: DBDIGebaeude;
  lastRaum: DBDIRaeume;
  lastInventoryDetails: LastInventoryDetails;
  private connectionSubscription: Subscription;

  subscriptionMetaMsg: Subscription;
  subscriptionMetaErr: Subscription;
  subscriptionMetaData: Subscription;
  subscriptionLoadingStatus: Subscription;
  listMetaData: LoadingMetaData[] = [];
  listMetaMsg: {type: string, message: string}[] = [];
  lastMetaErr = '';
  lastMetaMsg = '';
  showListmetaMsg = false;

  tablesLoadingStatus: TableLoadingStatus[] = [];
  tablesLoadingStarted = false;
  tablesLoadingDetailsIsExpanded = false;

  constructor(
    private dataService: DataService,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private baseData: BasedataService,
    private progressService: InventoryProgressService,
    private connection: ConnectionService,
    private dbsyncLogService: DbsyncLogService) {
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
    this.loading = false;
    this.lastInventory = this.baseData.getCurrentInventur();
    this.lastBuilding = this.baseData.getCurrentGebaeude();
    this.lastRaum = this.baseData.getCurrentRaum();
    this.tablesLoadingStarted = Object.keys(this.tablesLoadingStatus).length > 0;

    this.routingSubscription = this.route.params.subscribe(params => {
      console.log({params});
    });

    this.hasConnection = this.connection.hasServerAccess;
    this.hasServerConnection = this.connection.hasServerAccess;

    this.subscriptionLoadingStatus = this.dataService.loadingDataChanged
      .subscribe( (stat: TablesLoadingStatus) => {
        this.tablesLoadingStarted = true;
        for (const tbl in stat) {
          if (!stat.hasOwnProperty(tbl)) {
            continue;
          }
          if (!this.tablesLoadingStatus.find( (tblStat) => tblStat.table === tbl)) {
            this.tablesLoadingStatus.push(stat[tbl]);
            continue;
          }
          const tblIdx = this.tablesLoadingStatus.findIndex( (tblStat) => tblStat.table === tbl);

          for (const statKey in stat[tbl]) {
            if ( stat[tbl].hasOwnProperty(statKey) && stat[tbl][statKey] !== this.tablesLoadingStatus[tblIdx][statKey]) {
              this.tablesLoadingStatus[tblIdx][statKey] = stat[tbl][statKey];
            }
          }
        }
    });

    this.connectionSubscription = this.connection.monitor().subscribe( (conn: ConnectionState) => {
      this.hasConnection = conn.hasNetworkConnection;
      this.hasServerConnection = conn.hasServerAccess;

      if (this.statusLoadingUserInventories < StatusLoadingInventories.FinishedSuccessful) {
        this.checkLoadUserInventories();
      }
    });

    this.subscriptionMetaData = this.dbsyncLogService.loadingMetaData.subscribe( (data: LoadingMetaData) => {
      if (data.table) {
        const existing = this.listMetaData.find((item) => item.table === data.table);
        if (existing) {
          existing.message = data.message;
          if (data.executed) {
            existing.executed = data.executed;
          }
          if (data.total) {
            existing.total = data.total;
          }
        }
      }
    });

    this.subscriptionMetaMsg = this.dbsyncLogService.loadingMetaMessage.subscribe( (data: LoadingMetaMessage) => {
      this.lastMetaMsg = data.message;
      this.listMetaMsg.push({
        type: 'success',
        message: data.message
      });
    });

    this.subscriptionMetaErr = this.dbsyncLogService.loadingMetaError.subscribe( (data) => {
      this.lastMetaErr = data.message;
      this.listMetaMsg.push({
        type: 'danger',
        message: data.message
      });
    });

    if (!this.connection.hasNetworkConnection) {
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

  closeMsg(msg: any) {
    this.listMetaMsg.splice(this.listMetaMsg.indexOf(msg), 1);
  }

  private async loadLastInventoryDetails() {
    this.lastInventoryDetails = null;
    const inv = this.baseData.getCurrentInventur();
    const geb = this.baseData.getCurrentGebaeude();
    const mandant = await this.dataService.getClient(inv.mid);
    const rm = this.baseData.getCurrentRaum();

    if (inv && geb && mandant) {
      this.lastInventoryDetails = {
        jobid: inv.jobid,
        mid: inv.mid,
        gid: geb.gid,
        Titel: inv.Titel,
        Mandant: mandant.Mandant,
        Gebaeude: geb.Gebaeude,
        routeParams: [inv.mid, geb.gid],
        Etage: null,
        Raum: null,
        Raumbezeichnung: null
      };
      if (rm) {
        this.lastInventoryDetails.ruuid = rm.uuid;
        this.lastInventoryDetails.Etage = rm.Etage;
        this.lastInventoryDetails.Raum = rm.Raum;
        this.lastInventoryDetails.Raumbezeichnung = rm.Raumbezeichnung;
        this.lastInventoryDetails.routeParams.push( rm.uuid );
      }
    }
  }

  gotoLastInventory() {
    if (this.lastInventoryDetails && this.lastInventoryDetails.routeParams.length > 1) {
      this.gotoFormInventory.apply(this, this.lastInventoryDetails.routeParams );
    }
  }

  private gotoFormInventory(mid: number, gid: number, ruuid?: string): void {
    const routeData = [ '/form-inventory', mid, gid ];
    if (ruuid && ruuid.length > 0) {
      routeData.push(ruuid);
    }
    this.router.navigate( routeData );
  }

  public checkLoadUserInventories(onlineOnly = true) {
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

  public getStatusLoadingInventoryText(status: StatusLoadingInventories): string {
    return StatusLoadingInventories[status];
  }

  public async loadUserInventories(): Promise<boolean> {
    console.log('ngOnInit select-iventory.components.ts');
    const uid = this.auth.getUser().id;
    const lastMid = this.baseData.getCurrentMid() || 0;
    const lastGid = this.baseData.getCurrentGid() || 0;
    const lastJobid = this.baseData.getCurrentJobid();
    const lastRuuid = this.baseData.getCurrentRuuid();

    return await this.dataService.getUserAssignedInventories( uid )
      .then( (result: DBDIInventuren[]) => {
        console.log({ called: 'this.dataService.getUserAssignedInventories', result});
        this.inventories = result;
        this.inventoriesSelectable = this.inventories;
        this.lastInventory = this.inventories.find( (inv) => inv.jobid === lastJobid);

        let defaultMid = 0;
        let defaultGid = 0;
        let defaultJobid = 0;

        this.statusLoadingUserInventories = StatusLoadingInventories.Loading;

        if (this.lastInventory) {
          this.loadLastInventoryDetails();
          defaultMid = this.lastInventory.mid;
          defaultGid = this.lastInventory.gid;
          defaultJobid = this.lastInventory.jobid;
        }

        const aMids = this.inventories.map<number>( (itm) => itm.mid );
        console.log( 'ngOnInit', { uid, aMids });

        return this.dataService.getClientList()
          .then( (mandanten: DBDIMandanten[]) => {
            this.clients = mandanten.filter( (itm) => aMids.indexOf( itm.mid ) !== -1 );
            return this.clients;
          })
          .then( clientList => {
            this.setDefaultSelection({
              mid: defaultMid,
              gid: defaultGid,
              jobid: defaultJobid
            });
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

  public setDefaultSelection(ids: InventurIds) {
    const clientListIdx = this.getClientListIdxByMid(ids.mid);
    if (-1 !== clientListIdx) {
      const clientChanged = this.clientChanged( clientListIdx);

      if (ids.gid || ids.jobid) {
        clientChanged.then( (success) => {
          if (!success) {
            return false;
          }
          if (ids.gid) {
            const buildingsListIdx = this.getBuildingListIdxByGid(ids.gid);
            this.buildingChanged(buildingsListIdx);
          }
          if (ids.jobid) {
            this.inventoriesSelectable = this.inventories.filter( (inv) => inv.mid === ids.mid);
            const checkInv = this.inventoriesSelectable.find( (inv) => inv.jobid === ids.jobid);
            if (checkInv) {
              this.inventory = checkInv;
              if (this.lastBuilding) {
                this.inventorySelectionChanged(checkInv.jobid).then(() => {
                  const checkGeb = this.buildings.find((b: DBDIGebaeude) => b.gid === this.lastBuilding.gid);
                  if (checkGeb) {
                    this.building = checkGeb;
                  }
                });
              }
            }
          }
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
    this.connectionSubscription.unsubscribe();

    this.subscriptionMetaMsg.unsubscribe();
    this.subscriptionMetaErr.unsubscribe();
    this.subscriptionMetaData.unsubscribe();
  }

  async clientChanged(clientIdx) {
    this.client = this.clients[ clientIdx];
    console.log('client changed to ', { clientIdx, this_clients: this.clients, this_client: this.client});
    this.buildings = await this.dataService.getBuildingList( this.client.mid );
    this.inventoriesSelectable = this.inventories.filter( (inv) => inv.mid === this.client.mid );
    console.log( 'assign selection buildings: ', this.buildings );
    return true;
  }

  async onSubmit() {
    this.loading = true;
    console.log( this.selectForm );
    if (!this.client || !this.inventory || !this.building) {
      this.status = 'Bitte vervollständige die Auswahl!';
      return;
    }

    this.jobid = this.inventory.jobid;
    this.baseData.setCurrentMandant(this.client);
    this.baseData.setCurrentInventur( this.inventory );
    this.baseData.setCurrentGebaeude( this.building );

    if (
      this.lastInventory && this.lastInventory.jobid === this.jobid
      && this.lastBuilding && this.lastBuilding.gid === this.building.gid
      && await this.dataService.hasValidInventurRevId(this.inventory.jobid)
      && await this.dataService.hasAllInventurData(this.inventory.jobid)
    ) {
      console.log('SelectInventoryComponent #410 onSubmit gotoLastInventory');
      this.gotoLastInventory();
    } else {
      console.log('SelectInventoryComponent #414 onSubmit dataService.loadInventurDataByInventurId', this.inventory.jobid);
      this.status = 'Bitte warten .... Inventarisierungsdaten werden vom Server geladen.';
      await this.dataService.loadInventurDataByInventurId( this.inventory.jobid );
      this.status = 'Daten wurden geladen';
      // More Control for navigate
      this.router.navigate([
        '/form-inventory', this.client.mid, this.building.gid
      ]);
    }
  }

  buildingChanged(buildingListIdx: number) {
    this.building = this.buildings[ buildingListIdx ];

    this.progressService.getCurrentGebaeudeProgress().then( (progress: InventoryProgress) => {
      this.totalElements = progress.total;
      this.doneElements = progress.done;
    });
  }

  async inventorySelectionChanged(jobid: number) {
    this.inventory = this.inventories.find((ivy) => ivy.jobid === jobid);
    this.buildings = await this.dataService.getBuildingListByJobid(this.inventory.jobid, this.inventory.mid);
  }

}
