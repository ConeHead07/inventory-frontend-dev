import {Injectable} from '@angular/core';
import {ApiService} from '../../api.service';
import {
  DBDIArtikel, DBDIDevices,
  DBDIGebaeude, DBDIHersteller, DBDIImages,
  DBDIInventar,
  DBDIInventuren, DBDIInventurenGebaeude,
  DBDIInventurenUser,
  DBDIMandanten, DBDIObjektbuchBarcodesLookup,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant,
  DBDIRaeume,
  DBDIRaumGebaeude,
  DexieService,
  IUnionLookupAssignedObject,
  LookupAssignedInventar,
  LookupAssignedObjektbuchArtikel,
  LookupAssignedRoom,
  LookupNoMatches,
  LookupResult,
  LookupResultType
} from '../../dexie.service';
import {User} from '../../auth/user.model';
import {ConnectionService, ConnectionState} from '../../connection-service.service';
import {throwError} from 'rxjs';
import {VariablesService} from './variables.service';
import {last} from 'rxjs/operators';
import Dexie, {IndexableType } from 'dexie';
import {DBSyncClientService, SyncJobResult} from '../../dbsync-client.service';
import {BarcodeService} from '../../invent-form/data-services/barcode.service';

export interface LoadApiDataResult {
  success: boolean;
  errorMsg?: string;
  total?: number;
  inserts?: number;
  revisionId?: number;
  switchedToSync?: boolean;
  syncJobResult?: SyncJobResult;
  debug?: any;
}

export interface ArtikelRefAndData {
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface RaumAndGebaude {
  raum: DBDIRaeume;
  gebaeude: DBDIGebaeude;
}

export interface InventarData {
  inventar: DBDIInventar;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export enum InventarDataResultError {
  InventarNotFound = 1,
  ArtikelRefNotFound,
  ArtikelDataNotFound
}

export interface InventarDataResult {
  success: boolean;
  errorMsg?: string;
  errorCode?: InventarDataResultError;
  inventarData?: InventarData;
}

export interface ApiCollectionDataResponse<T> {
  revisionId: number;
  rows: T[];
}

export interface TableIdxProps {
  [key: string]: IndexableType;
}

export interface RefsStrict {
  [key: string]: [ string|string[], Dexie.Table<any, any>, string|string[]];
}
export interface RefsFlex {
  [key: string]: string|Dexie.Table<any, any>|[ (string|string[])?, (string|Dexie.Table<any, any>)?, (string|string[])?];
}

export interface JoinOptions {
  refs?: RefsFlex;
  filter?: (obj: any) => boolean;
  map?: (oby: any) => any;
  multi?: boolean;
  limit?: number;
  sort?: (obj: any) => number;
  groupCounter?: { [key: string]: (obj: any) => number };
  groupReducer?: { [key: string]: (obj: any) => any };
  joins?: JoinOptions[];
}

export interface JoinFlexFormatted {
  parentKey?: string|string[];
  table: string|Dexie.Table<any, any>;
  key?: string|string[];
  alias?: string;
  where?: TableIdxProps;
  multi?: boolean;
  offset?: number;
  limit?: number;
  filter?: (obj: any) => boolean;
  map?: (obj: any) => any;
  sort?: (a: any, b: any) => number;
  refs?: RefsFlex;
  joins?: any[];
}
export enum JoinResultType {
  List,
  First,
  Count,
}
export interface JoinStrictFormatted {
  parentKey?: string|string[];
  table: Dexie.Table<any, any>;
  key: string|string[];
  alias: string;
  resultType: JoinResultType;
  multi?: boolean;
  offset?: number;
  limit?: number;
  sortBy?: string;
  where?: TableIdxProps;
  filter?: (obj: any) => boolean;
  map?: (obj: any) => any;
  sort?: (a: any, b: any) => number;
  refs?: RefsStrict;
  joins?: JoinStrictFormatted[];
}

const log = {
  info: (line: number, ...vars: any) => {
    const l = console.log.bind(console, '[INFO] data.service.ts #' + line);
    l.apply(console, vars);
  },
  err: (line: number, ...vars: any) => {
    const l = console.error.bind(console, '[ERROR] data.service.ts #' + line);
    l.apply(console, vars);
  },
  dbg: (line: number, ...vars: any) => {
    const l = console.log.bind(console, '[Debug] data.service.ts #' + line);
    l.apply(console, vars);
  },
  warn: (line: number, ...vars: any) => {
    const l = console.log.bind(console, '[Warning] data.service.ts #' + line);
    l.apply(console, vars);
  }
};

@Injectable({
  providedIn: 'root'
})
export class DataService {

  currentState: ConnectionState;
  lastLoadFailed = false;
  lastFailed;

  constructor(
    private api: ApiService,
    private dexie: DexieService,
    private barcodeLookup: BarcodeService,
    private connectionService: ConnectionService,
    private settingsService: VariablesService,
    private DbSyncService: DBSyncClientService) {
    this.currentState = connectionService.getCurrentState();
    this.connectionService.monitor().subscribe((currentState: ConnectionState) => {
      log.info(43, 'network status has changed', { currentState });
      this.currentState = currentState;
    });
  }

  getSelectedRoom() {

  }

  async getUserAssignedInventories(uid: number): Promise<DBDIInventuren[]>  {
    log.info(173, 'getUserAssignedInventories');
    let userInventuren: DBDIInventuren[] = [];

    if (this.currentState.hasInternetAccess) {
      log.dbg(177, 'getUserAssignedInventories, call loadUserAssignedInventories');
      await this.loadUserAssignedInventories();
    } else {
      log.err(180,
        'getUserAssignedInventories no InternetAccess. Cannot call loadUserAssignedInventories',
        { 'this.currentState': this.currentState, 'this.currentState.hasInternetAccess': this.currentState.hasInternetAccess });
      return null;
    }

    await Promise.all([
      this.dexie.inventuren.toArray(),
      this.dexie.inventurenUser.where('uid').equals(uid).toArray()
    ]).then( (results) => {
      const inv = results[0];
      const jobids = results[1].map( (itm) => itm.jobid );

      userInventuren = inv.filter( (itm) => jobids.indexOf(itm.jobid) !== -1 );
      console.log('#72 getUserAssignedInventories', { inv, jobids, userInventuren } );
    });
    return userInventuren;
  }


  loadInventurSelection() {

  }

  async loadUserAssignedInventories(): Promise<boolean>  {
    log.dbg(205, 'loadUserAssignedInventories');

    const db = this.dexie;
    const api = this.api;

    // jobidsByAuthUser
    return await Promise
    .all([
      api.get<any>( 'auth/me').toPromise(),
      api.get<DBDIInventurenUser[]>( 'api/inventur/jobidsByAuthUser').toPromise(),

      api.get<DBDIMandanten[]>( 'api/inventur/clientsByAuthUser').toPromise()
        .then( list => Promise.all( list.map( (item: DBDIMandanten) => db.mandanten.put(item) ) ) ),

      api.get<DBDIGebaeude[]>( 'api/inventur/gebaeudeByAuthUser').toPromise()
        .then( list => Promise.all( list.map( (item: DBDIGebaeude) => db.gebaeude.put(item) ) ) ),

      api.get<DBDIInventuren[]>( 'api/inventur/listByAuthUser').toPromise()
        .then( list => Promise.all( list.map( (item: DBDIInventuren) => db.inventuren.put(item) ) ) ),

      api.get<DBDIInventurenGebaeude[]>( 'api/inventur/inventurenGebaeudeByAuthUser').toPromise()

    ])
      .then( async (results) => {
        const authUser = results[0];
        const invUser = results[1];
        const mandantenRslt = results[2];
        const gebaeudeRslt = results[3];
        const inventurenRslt = results[4];
        const invGebaeude = results[5];
        log.dbg(247, { results });

        const del = await db.inventurenUser.where('uid').equals(authUser.id).delete();
        await invUser.map((item: DBDIInventurenUser) => db.inventurenUser.add(item));

        const delG = await db.inventurenGebaeude.where('uid').equals(authUser.id).delete()
          .catch( (reason) => console.error('Cannot delete GRef', reason));
        await invGebaeude.map((item: DBDIInventurenGebaeude) => db.inventurenGebaeude.add(item)
          .catch( (reason) => {
          console.error('Cannot add GRef', { item, reason} );
        }));

        console.log('Finished loading user-inventories');
        return true;
      })
      .finally( () => {
      });
  }

  async loadClientList(): Promise<any> {
    console.log('#244  data.service loadClientList');
    return this.api
      .get<any>( 'api/mandant')
      .subscribe( (list: DBDIMandanten[]) => {
        console.log( 'SelectInventoryComponent', 'loadClientList', {list });

        const asyncJobs: Promise<void|number>[] = [];
        asyncJobs.push(this.dexie.mandanten.clear());
        list.forEach( (item: DBDIMandanten) => {
          console.log({ called: 'loadClientList', item });
          asyncJobs.push( this.dexie.mandanten.put(item) );
        });
        Promise.all( asyncJobs ).finally( () => {} );
      });
  }

  async loadGebaeudeListByClientId(mid: number): Promise<boolean> {
    console.log('#261  data.service loadGebaeudeListByClientd');
    await this.api
      .get<any>( 'api/mandant/' + mid + '/gebaeude')
      .subscribe( (list: DBDIGebaeude[]) => {
        console.log( 'SelectInventoryComponent', 'loadClientList', {list });

        this.dexie.gebaeude.where('mid').equals(mid)
          .delete()
          .then( () => {
            return list.map( (item: DBDIGebaeude) => {
              console.log({ called: 'loadGebaeudeList', item });
              return this.dexie.gebaeude.put(item);
            });
          })
          .finally( () => {
          });
      });

    return true;
  }

  async loadRaeumeListByGebaeudeId(gid: number): Promise<void> {
    console.log('#283  data.service');
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( async (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.stopChangeLogForImport( true );
      await this.dexie.raeume
        .where('gid').equals(gid)
        .delete()
        .then( (nr) => list.map( (item: DBDIRaeume) => {
          console.log({ called: 'loadClientList', item });
          return this.dexie.raeume.put(item);
        })
        )
        .finally( () => {
          this.dexie.stopChangeLogForImport( false );
        });
    });
  }

  async loadInventar(gid: number): Promise<void> {
    console.log('#303  data.service');
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( async (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.stopChangeLogForImport( true);
      console.log('#303 data-service delete raeume');
      return this.dexie.raeume.where('gid').equals(gid)
        .delete()
        .then( (nr: number) => {
          return list.map( (item: DBDIRaeume) => {
            console.log({ called: 'loadClientList', item });
            return this.dexie.raeume.put(item);
          });
        })
        .finally( () => {
          this.dexie.stopChangeLogForImport( false );
        });
      });
  }

  async loadInventurDataByInventurId(jobid: number, reset: boolean = false): Promise<LoadApiDataResult[]> {
    console.log('#324 called loadInventurDataByInventurId(', jobid, reset, ')');
    const tables = {
      gebaeude: 'pending',
      raeume: 'pending',
      hersteller: 'pending',
      images: 'pending',
      inventar: 'pending',
      objektkatalogglobal: 'pending',
      objektkatalogmandant: 'pending',
      objektbuchBarcodesLookup: 'pending'
    };

    const tblStatus = (table, status) => {
      tables[ table ] = status;
      console.log( tables );
    };

    const inventurAlreadyStartedRevId = +(await this.settingsService.get('jobid-' + jobid + '-revision-id', 0));
    console.log('#335 loadInventurDataByInventurId, inventurAlreadyStartedRevId: ', inventurAlreadyStartedRevId);

    if (!isNaN(inventurAlreadyStartedRevId) && inventurAlreadyStartedRevId > 0 && !reset) {
      console.log('#338 loadInventurDataByInventurId');
      const numUnsyncedClientChanges = await this.DbSyncService.numUnsyncedChangeLogsByJobId(jobid);
      console.log('#340 loadInventurDataByInventurId', {numUnsyncedClientChanges});
      if (numUnsyncedClientChanges) {
        console.log('#342 loadInventurDataByInventurId START SYNC', {numUnsyncedClientChanges});
        const syncJobResult = await this.DbSyncService.syncJob(jobid);
        return [{
          success: true,
          switchedToSync: true,
          syncJobResult
        }] as LoadApiDataResult[];
      } else {
        console.log('#346 loadInventurDataByInventurId NOTHING TO SYNC');
        return [{
          success: true,
          errorMsg: '',
          total: 0,
          inserts: 0,
          revisionId: await this.settingsService.get('jobid-' + jobid + '-revision-id'),
          debug: null,
        }];
      }
    }

    this.dexie.stopChangeLogForImport( true );
    if (reset) {
      console.log('#352 loadInventurDataByInventurId');
      const numRaeume = await this.dexie.raeume.where( { for_jobid: jobid}).count().catch( (reason) => {
        console.error('#354 ', { reason });
      });
      console.log('#357 Before cleanup');
      await Promise.all([
        this.dexie.raeume.where( { for_jobid: jobid}).delete()
          .finally(() => console.log('#359finished cleanup raeume')),
        this.dexie.inventar.where( { for_jobid: jobid}).delete()
          .finally(() => console.log('#361 finished cleanup inventar')),
        this.dexie.hersteller.where( { for_jobid: jobid}).delete()
          .finally(() => console.log('#363 finished cleanup hersteller')),
        this.dexie.images.filter( (img) => img.for_jobid === jobid).delete()
          .finally(() => console.log('#365 finished cleanup images')),
        this.dexie.objektKatalogMandant.where( { created_jobid: jobid}).delete()
          .finally(() => console.log('#367 finished cleanup okg')),
        this.dexie.objektKatalogGlobal.where( { created_jobid: jobid}).delete()
          .finally(() => console.log('#369 finished cleanup okm')),
        this.dexie.clientChangeLog.where({ jobid }).delete()
          .finally(() => console.log('#371 finished cleanup clientchangelog'))
      ]);
      console.log('#373 After cleanup');
      this.settingsService.set('jobid-' + jobid + '-revision-id', 0);
      this.settingsService.set('inventar-' + jobid + '-revision-id', 0);
      this.settingsService.set('raeume-' + jobid + '-revision-id', 0);
      this.settingsService.set('images-' + jobid + '-revision-id', 0);
      this.settingsService.set('hersteller-' + jobid + '-revision-id', 0);
      this.settingsService.set('objektKatalogGlobal-' + jobid + '-revision-id', 0);
      this.settingsService.set('objektKatalogMandant-' + jobid + '-revision-id', 0);
      console.log('#362 loadInventurDataByInventurId');
    }

    return await Promise
      .all([
        this.loadTableDataByUrl<DBDIGebaeude>(
          'gebaeude', `api/inventur/${jobid}/gebaeude`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIRaeume>(
          'raeume', `api/inventur/${jobid}/raeume`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIHersteller>(
           'hersteller', `api/inventur/${jobid}/hersteller`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIImages>(
          'images', `api/inventur/${jobid}/images`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIInventar>(
          'inventar', `api/inventur/${jobid}/inventar`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIObjektKatalogGlobal>(
          'objektKatalogGlobal', `api/inventur/${jobid}/katalog`, tblStatus, { jobid, reset }),
        this.loadTableDataByUrl<DBDIObjektKatalogMandant>(
          'objektKatalogMandant', `api/inventur/${jobid}/artikelids`, tblStatus, { jobid, reset })
        // ,this.loadTableDataByUrl<DBDIObjektbuchBarcodesLookup>(
        //   'objektbuchBarcodesLookup', `api/inventur/${jobid}/objektbuchLookup`, tblStatus, { jobid, reset })
      ])
      .then( async (results) => {
        const maxRevId = results.reduce( (carry, item) => {
          if (isNaN(item.revisionId)) {
            return carry;
          }
          const max = Math.max(carry, item.revisionId || 0);
          console.log('#414 data.service reduce to maxRevId', { carry, item, max });
          return Math.max(carry, item.revisionId);
        }, 0);
        this.settingsService.set('jobid-' + jobid + '-revision-id', maxRevId);
        console.log('#418 data.service.loadInventurDataByInventurId() Start rebuild of barcodeLookup Table');
        await this.barcodeLookup.rebuildByJobid(jobid);
        console.log('435 data.service.loadInventurDataByInventurId() finished', 'arguments', arguments);
        return results;
      })
      .finally( () => {
        this.dexie.stopChangeLogForImport( false );
      });
  }

  async loadTableDataByUrl<T>(table: string, url: string, cbTblStatus?: any, options?: any): Promise<LoadApiDataResult> {
    console.log('#425  data.service loadTableDataByUrl ', table);
    if (cbTblStatus) {
      cbTblStatus(table, 'downloading');
    }
    const jobid = options.jobid;
    const reset = options.reset || false;
    const varLastRevisionId = `${table}-${jobid}-revision-id`;
    const varLastLoadAttempt = `${table}-${jobid}-download-attempt`;
    const varLastLoadSuccess = `${table}-${jobid}-download-success`;
    const varLastLoadEntries = `${table}-${jobid}-download-entries`;
    const lastRevisionId = await this.settingsService.get( varLastRevisionId );
    const lastLoadSuccessDate = await this.settingsService.get( varLastLoadSuccess );
    const lastLoadAttemptDate = new Date();
    this.settingsService.set(varLastLoadAttempt, lastLoadAttemptDate);

    if (!reset && lastLoadSuccessDate) {
      url += '?lastLoad=' + Date.parse( lastLoadSuccessDate ) + '&lastRevId=' + lastRevisionId;
    }

    let inserts = 0;
    let total = 0;
    let revisionId = 0;

    console.log({ function: 'loadTableDataByUrl', table, url, cbTblStatus, options });
    return await this.api.get<any>( url).toPromise()
      .then( (data: ApiCollectionDataResponse<T>) => {

        console.log('#452 data.service: Retrieved Data ', table, ' for processing!');
        this.settingsService.set(varLastRevisionId, data.revisionId);
        this.settingsService.set(varLastLoadSuccess, lastLoadAttemptDate);
        this.settingsService.set(varLastLoadEntries, data.rows.length);

        if (cbTblStatus) {
          cbTblStatus(table, 'process import ' + data.rows.length);
          cbTblStatus(table, 'total: ' + data.rows.length);
        }

        inserts = 0;
        total = data.rows.length;
        revisionId = data.revisionId || 0;

        const stepSize = parseInt((data.rows.length / 10).toString(), 10);
        if (!data.rows) {
          console.error('#468 data.service loadTableDataByUrl Invalid Data-Structure from ', { url, data});
        }

        const asyncJobs: Promise<any>[] = data.rows.map((item: T, i) => {
          if (((i + 1) % stepSize === 0 || (i + 1) === total) && cbTblStatus) {
            cbTblStatus(table, i + 1);
          }
          return this.dexie.table(table).put(item).then(() => {
            inserts += 1;
            return true;
          });
        });
        return asyncJobs;
      })
      .then( () => {
        if (cbTblStatus) {
          cbTblStatus(table, 'finished');
        }

        console.log( '#487 data.service loadTableDataByUrl Finished Importprocess Data ', table );

        return {
          success: true,
          errorMsg: '',
          total,
          inserts,
          revisionId,
        } as LoadApiDataResult;
      });
  }

  async getClient(clientID: number): Promise<DBDIMandanten> | null {
    console.log('#500  data.service');
    const clients = await this.getClientList();
    const fclients = clients.filter( client => client.mid === clientID);
    console.log( { clientID, clients, fclients });
    return fclients.length ? fclients[0] : null;
  }

  async getBuilding(bldgID: number, clientID: number): Promise<DBDIGebaeude> | null {
    console.log('#508  data.service');
    const bldgs = await this.getBuildingList(clientID);
    const fbldgs = bldgs.filter( bldg => bldg.gid === bldgID);
    console.log( { bldgID, clientID, bldgs, fbldgs });
    return fbldgs.length ? fbldgs[0] : null;
  }

  async getClientList(): Promise<DBDIMandanten[]>  {
    console.log('#516  data.service');
    return await this.dexie.mandanten.toArray();
  }

  getFullArtikelData(link: DBDIObjektKatalogMandant, globalData: DBDIObjektKatalogGlobal): DBDIArtikel {
    console.log('#521  data.service');
    return {...link, ...globalData} as DBDIArtikel;
  }

  getFullRaumData(raum: DBDIRaeume, gebaeude: DBDIGebaeude): DBDIRaumGebaeude {
    console.log('#526  data.service');
    const raumGebaeudeData: DBDIRaumGebaeude = {...raum, ...gebaeude};
    return raumGebaeudeData;
  }

  getArtikelRefByGcuuidMid(gcuuid: string, mid: number): Promise<DBDIObjektKatalogMandant> {
    console.log('#532  data.service');
    return this.dexie.objektKatalogMandant.where( { gcuuid, mid } ).first();
  }

  public async getArtikelRef(mcid: number): Promise<DBDIObjektKatalogMandant> {
    console.log('#537  data.service');
    return this.dexie.objektKatalogMandant.get( mcid );
  }

  public async getArtikelData(gcid: number): Promise<DBDIObjektKatalogGlobal> {
    console.log('#542  data.service');
    return this.dexie.objektKatalogGlobal.get( gcid );
  }

  public async getArtikel(id: number): Promise<DBDIArtikel> {
    console.log('#547  data.service');
    const artikelLink = await this.dexie.objektKatalogMandant.get( { mcid: id } );
    const artikelData = await this.dexie.objektKatalogGlobal.get( { gcid: artikelLink.gcid } );
    console.log('getArtikel by id', { id, artikelLink, artikelData});
    return this.getFullArtikelData(artikelLink, artikelData);
  }

  public async getArtikelRefAndData(id: number): Promise<ArtikelRefAndData> {
    console.log('#555  data.service');
    const artikelRef = await this.dexie.objektKatalogMandant.get( { mcid: id } );
    const artikelData = await this.dexie.objektKatalogGlobal.get( { gcid: artikelRef.gcid } );
    return {
      artikelRef,
      artikelData
    };
  }

  public async getInventarRef(ivid: number): Promise<DBDIInventar> {
    console.log('#565  data.service');
    return this.dexie.inventar.get(ivid);
  }

  public async getInventarData(ivid: number): Promise<InventarDataResult> {
    console.log('#570  data.service');
    const inventarRef = await this.dexie.inventar.get( ivid );
    if (!inventarRef) {
      return { success: false, errorCode: InventarDataResultError.InventarNotFound };
    }
    const artikelRef = await this.dexie.objektKatalogMandant.get( inventarRef.mcid );
    if (!artikelRef) {
      return { success: false, errorCode: InventarDataResultError.ArtikelRefNotFound };
    }
    const artikelData = await this.dexie.objektKatalogGlobal.get (artikelRef.gcid );

    if (!artikelData) {
      return { success: false, errorCode: InventarDataResultError.ArtikelDataNotFound };
    }

    return {
      success: true,
      inventarData: {
        inventar: inventarRef,
        artikelRef,
        artikelData
      }
    };
  }

  public async getRaumAndGebaeude(id: number): Promise<RaumAndGebaude> {
    console.log('#596  data.service');
    console.log('getRaum by id', id);

    const raum = await this.dexie.raeume.get( id );
    if (raum) {
      const gebaeude = await this.dexie.gebaeude.get( raum.gid );
      return {
        raum,
        gebaeude
      };
    }
    return null;
  }

  public getRaum(id: number) {
    console.log('#611  data.service');
    console.log('getRaum by id', id);

    let raum: DBDIRaeume;
    return this.dexie.raeume.get( {rid: id})
      .then( (data: DBDIRaeume) => {
        raum = data;
        const gid = raum.gid;
        return this.dexie.gebaeude.get({ gid });
      })
      .then( (gebaeude: DBDIGebaeude) => this.getFullRaumData(raum, gebaeude));
  }

  public getRaeumeByGebaeudeId(gid: number): Promise<DBDIRaeume[]> {
    console.log('#625 data.service Search in rooms by gid', gid);
    return this.dexie.raeume.where({ gid }).toArray();
  }

  public async getArtikelListByClientId(mid: number): Promise<DBDIArtikel[]> {
    console.log('#630 data.service Search in Global Katalog by mid', mid);

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where({ mid }).toArray();

    const artikelData = await Promise.all(artikelRefs.map( async (ref) => this.dexie.objektKatalogGlobal.get( ref.gcid )));

    return artikelRefs.map( (ref, i) => ({...artikelData[i], ...ref, ...{ mcuuid: ref.uuid }}) );
  }

  public async bcLookup(barcode: string, mid: number): Promise<IUnionLookupAssignedObject> {
    console.log('#641 barcodeLookup', {barcode, mid});

    const lookupInventar = await this.getInventarByBarcode(barcode, mid);

    if (lookupInventar.type === LookupResultType.Inventar) {
      return lookupInventar;
    }

    // Otherwise return the Result of Raum-Lookup
    const lookupRaum = await this.getRaumByBarcode(barcode, mid);
    if (lookupRaum.type === LookupResultType.Raum) {
      return lookupRaum;
    }

    const lookupArtikel = await this.getArtikelByBarcode(barcode, mid);
    if ('type' in lookupArtikel && lookupArtikel.type === LookupResultType.ObjektBuchArtikel) {
      return lookupArtikel as LookupAssignedObjektbuchArtikel;
    }

    console.error('Barcode-Lookup erzielte kein Match für: ', { barcode, mid });
    return { type: LookupResultType.NoMatch };
  }

  async getInventarByBarcode(barcode: string, useMid?: number): Promise<LookupAssignedInventar|LookupNoMatches> {
    console.log('#665  data.service');
    const db = this.dexie;

    console.log('#380 barcodeLookup in inventar', { barcode, useMid });
    const inventarMatches = await db.inventar
      .where( { code: barcode } )
      .toArray();
    console.log('#383 barcodeLookup in inventar', { inventarMatches });

    for (const inventar of inventarMatches) {
      const artikelRef = await db.objektKatalogMandant.get(inventar.mcid);
      console.log('#387 barcodeLookup in inventar', { artikelRef });
      if (!useMid || artikelRef.mid === useMid) {
        const artikelData = await db.objektKatalogGlobal.get(artikelRef.gcid);
        console.log('#389 barcodeLookup in inventar', { artikelData });

        return {
          type: LookupResultType.Inventar,
          inventar,
          artikelRef,
          artikelData
        };
      }
    }
    console.log('#398 barcodeLookup in inventar', 'No-Match');

    return {
      type: LookupResultType.NoMatch
    };
  }

  async getRaumByBarcode(barcode: string, useMid?: number): Promise<LookupAssignedRoom|LookupNoMatches> {
    console.log('#697  data.service');
    const db = this.dexie;

    console.log('#412 barcodeLookup in raeume', { barcode, useMid});
    const raumMatch = await db.raeume.where( { code: barcode } ).first();

    if (raumMatch) {
      const gebaeude = await db.gebaeude.get(raumMatch.gid);

      return {
        type: LookupResultType.Raum,
        raum: raumMatch,
        gebaeude
      };
    }

    console.log('#232 barcodeLookup NOT FOUND', { barcode, useMid});
    return { type: LookupResultType.NoMatch };
  }

  async getArtikelByBarcode(barcode: string, useMid?: number):
    Promise<LookupResult|LookupAssignedObjektbuchArtikel|LookupAssignedObjektbuchArtikel[]> {
    console.log('#719  data.service');
    const db = this.dexie;

    console.log('#517 barcodeLookup in Objektbuch', { barcode, useMid});
    const listArtikelData = await db.objektKatalogGlobal.where( { code: barcode } ).toArray();

    if (listArtikelData.length === 0) {
      console.log('#521 barcodeLookup in Objektbuch NOT FOUND', {barcode, useMid});
      return {type: LookupResultType.NoMatch};
    }

    return db.objektKatalogMandant.where( 'gcid')
      .anyOf( listArtikelData.map<number>( (d) => d.gcid))
      .filter( (d) => !useMid || d.mid === useMid)
      .toArray()
      .then( (refs) => {
        if (refs.length === 0) {
          console.log('#531 barcodeLookup im Mandanten-Objektbuch NOT FOUND', {barcode, useMid});
          return {type: LookupResultType.NoMatch};
        }
        if (refs.length === 1) {
          return {
            type: LookupResultType.ObjektBuchArtikel,
            artikelRef: refs[0],
            artikelData: listArtikelData.find( itm => itm.gcid === refs[0].gcid )
          };
        }
        return refs.map<LookupAssignedObjektbuchArtikel>( artikelRef => {
          return {
            type: LookupResultType.ObjektBuchArtikel,
            artikelRef,
            artikelData: listArtikelData.find( itm => itm.gcid === artikelRef.gcid )
          };
        });
      });
  }

  async getBuildingList(clientID: number): Promise<DBDIGebaeude[]> {
    console.log('#757  data.service');
    const list = await this.dexie.gebaeude.where({mid: clientID}).toArray();
    console.log('#336 async getBuildingList', list);
    return list;
  }

  async getBuildingListByJobid(jobid: number, clientID: number): Promise<DBDIGebaeude[]> {
    console.log('#764  data.service');
    const listGebaeudeRef = await this.dexie.inventurenGebaeude.where({jobid}).toArray();
    const listGid = listGebaeudeRef.map( (jg) => jg.gid);
    const list = await this.dexie.gebaeude.where( 'gid').anyOf(listGid).filter( (g) => g.mid === clientID).toArray();
    console.log('#703 async getBuildingList by jobid', { jobid, clientID, listGebaeudeRef, listGid, list });
    return list;
  }

  joinsToStrictFormat(joins: JoinFlexFormatted, parent?: JoinFlexFormatted): JoinStrictFormatted {
    console.log('#773  data.service');
    const db = this.dexie;
    const f = { ...joins };
    if (typeof f.table === 'string' ) {
      f.table = db.table( f.table );
    }
    if (!f.alias) {
      f.alias = f.table.name;
    }
    if (parent) {
      const pTable = parent.table as Dexie.Table<any, any>;
      const fKey = f.table.schema.primKey.keyPath;
      const pKey = pTable.schema.primKey.keyPath;
      const fIndexes = f.table.schema.indexes;
      const pIndexes = pTable.schema.indexes;

      if (!f.key && !f.parentKey) {
        if (pIndexes.find( (idx) => JSON.stringify(idx.keyPath) === JSON.stringify(fKey) )) {
          f.key = fKey;
          f.parentKey = fKey;
        } else if (fIndexes.find( (idx) => JSON.stringify(idx.keyPath) === JSON.stringify(pKey) )) {
          f.key = pKey;
          f.parentKey = pKey;
        }
      } else if (!f.key) {
        if (fIndexes.find( (idx) => JSON.stringify(idx.keyPath) === JSON.stringify(f.parentKey) )) {
          f.key = f.parentKey;
        }
      } else if (!f.parentKey) {
        if (pIndexes.find( (idx) => JSON.stringify(idx.keyPath) === JSON.stringify(f.key) )) {
          f.parentKey = f.key;
        }
      }
    }
    if (f.joins && Array.isArray(f.joins)) {
      f.joins = f.joins.map( (jn) => this.joinsToStrictFormat(jn, f) );
    }
    return f as JoinStrictFormatted;
  }

  joinieTables(join: JoinStrictFormatted): Dexie.Table<any, any>[] {
    console.log('#814  data.service');
    let tables: Dexie.Table<any, any>[] = [ join.table ];
    if (join.joins) {
      join.joins.forEach( (jn) => tables = tables.concat( this.joinieTables( jn )) );
    }
    return tables;
  }

  async joinie(flexJoins: JoinFlexFormatted): Promise<any[]|Dexie.Collection<any, any>> {
    console.log('#823  data.service');
    const joins: JoinStrictFormatted = this.joinsToStrictFormat(flexJoins);

    const db = this.dexie;
    const Promise = Dexie.Promise;
    const tables: Dexie.Table<any, any>[] = this.joinieTables(joins);
    const debugConsole = console;
    const debugJoinie = false;
    const logDebug = (...args: any[]) => {
      if (debugJoinie) {
        if ( 'debug' in debugConsole) {
          (debugConsole as unknown as any).debug.apply(debugConsole, arguments);
        } else if ( 'log' in debugConsole) {
          (debugConsole as unknown as any).log.apply(debugConsole, arguments);
        }
      }
    };
    logDebug('found Tables in recursive join', tables);
    const fullRslt: any[] = [];

    return db.transaction('r', tables, async () => {
      let coll: Dexie.Collection<any, any>;
      if (joins.where) {
        logDebug('Create collection with where Query:', joins.where);
        coll = joins.table.where( joins.where );
      } else {
        logDebug('Create collection from table:', joins.table.name);
        coll = joins.table.toCollection();
      }
      logDebug('#706');

      if (!joins.joins || !joins.joins.length) {
        logDebug('#709');
        return coll;
      }
      const recursiveRelationshipMapper = async (parent: any, subJoins: JoinStrictFormatted[], deep: number): Promise<boolean> => {
        if (!subJoins || subJoins.length === 0) {
          logDebug('#714');
          return true;
        }
        for (const join of subJoins) {
          const references = {};
          const resultType = !('resultType' in join) ? JoinResultType.List : join.resultType;
          const filterKeysBeforeJoin = !join.where ? [] : Object.keys(join.where);
          const filter = !filterKeysBeforeJoin.length
              ? null
              : (obj: any) => {
                for (const k of filterKeysBeforeJoin) {
                  if (obj[k] !== join.where[k]) {
                    return false;
                  }
                }
                return true;
              };

          if (!Array.isArray(join.key) && !Array.isArray(join.parentKey)) {
            references[join.key] = parent[join.parentKey];
          } else if (Array.isArray(join.key) && Array.isArray(join.key) && join.key.length === join.parentKey.length) {
            join.key.forEach( (k, i) => {
              references[k] = parent[ join.parentKey[i] ];
            });
          }
          logDebug('#738');

          const hasNullKeys = Object.values(references).length !== Object.values(references).filter(k => {
            const isValid = !(k === 0 || k === '' || k === null || k === undefined || typeof k === 'undefined');
            logDebug('#741', { k, isValid });
            return isValid;
          }).length;
          if (hasNullKeys) {
            logDebug('#745 Abort Join-Query with Null-Keys on Leading Table: ', { where: references, obj: parent,
            joinTable: join.table });
            return false;
          }

          logDebug('#738 query join with references', { hasNullKeys, references} );
          if (resultType === JoinResultType.Count) {
            parent[join.alias] = await join.table.where(references).count();
            return true;
          } else if (resultType === JoinResultType.First) {
            parent[join.alias] = await join.table.where(references).first();
            return true;
          }
          await join.table.where( references ).each(subItm => {

            logDebug('#750');
            // Possibility to remove Item before executing Join-Queries
            if (filter && !filter(subItm)) {
              logDebug('#753 removed item');
              return;
            }

            recursiveRelationshipMapper(subItm, join.joins || [], deep + 1).then( (b) => {
              logDebug('#758');
              if ( ((join.alias in parent) && parent[join.alias]) && (
                join.multi === false
                || (
                    !isNaN(join.limit)
                    && (isNaN(join.offset) || join.offset === 0)
                    && !join.sort
                    && Array.isArray(parent[join.alias])
                    && ( join.limit <= parent[join.alias].length)
                ))) {
                logDebug('#768');
                return;
              }
              if (join.filter && !join.filter(subItm)) {
                logDebug('#772');
                return; // Nothing
              }

              if (join.map) {
                logDebug('#777');
                join.map(subItm);
              }

              if (!parent[join.alias]) {
                logDebug('#782');
                parent[join.alias] = (('multi' in join) && join.multi === true) ? [ subItm ] : subItm;
              } else if (!Array.isArray(parent[join.alias])) {
                logDebug('#785');
                parent[join.alias] = [parent[join.alias], subItm];
              } else {
                logDebug('#788');
                parent[join.alias].push(subItm);
              }
              return;
            });
          }).then( () => {
            logDebug('#794');
            if ( (join.alias in parent) && Array.isArray(parent[join.alias])) {
              logDebug('#796');
              if ( ('sort' in join) && join.sort) {
                console.log('#798');
                parent[join.alias] = (parent[join.alias] as any[]).sort( join.sort );
              }
              logDebug('#801');
              const offset = ('offset' in join) && !!isNaN(join.offset) ? join.offset : 0;
              logDebug('#803');
              const useLimit = ('limit' in join) && !!isNaN(join.limit);
              logDebug('#805');
              const maxLimit = parent[join.alias].length;
              if (offset > 0 || useLimit) {
                console.log('#808');
                parent[join.alias] = (parent[join.alias] as any[]).slice(offset, useLimit ? join.limit : maxLimit);
              }
            }
          });
        }
      };
      await coll.each(itm => {
        recursiveRelationshipMapper(itm, joins.joins || [], 0).then( (b) => {
          logDebug('#809 recursiveRelationMapper.then', { b });
          if (joins.filter && !joins.filter( itm )) {
            logDebug('#811 filter returns false for', { itm });
            return;
          }
          logDebug('#814 add item', { itm });
          fullRslt.push(itm);
        });
      });
    }).then( () => {
      logDebug('#827');
      if (('map' in joins) && joins.map && ('sort' in joins) && joins.sort) {
        logDebug('#829 return fullRslt map and sort');
        return fullRslt.map( joins.map ).sort( joins.sort );
      }
      logDebug('#832');
      if (('map' in joins) && joins.map) {
        logDebug('#834 return fullRslt.map');
        return fullRslt.map( joins.map );
      }
      if (('sort' in joins) && joins.sort) {
        logDebug('#838 return fullRlst.sort');
        return fullRslt.sort( joins.sort );
      }
      logDebug('#841 return fullRslt');
      return fullRslt;
    });
  }
}


