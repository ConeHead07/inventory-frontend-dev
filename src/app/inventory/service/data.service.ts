import {Injectable} from '@angular/core';
import {ApiService} from '../../api.service';
import {
  DBDIArtikel, DBDIDevices,
  DBDIGebaeude, DBDIHersteller, DBDIImages,
  DBDIInventar,
  DBDIInventuren,
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

export interface LoadApiDataResult {
  success: boolean;
  errorMsg?: string;
  total?: number;
  inserts?: number;
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
    private connectionService: ConnectionService,
    private settingsService: VariablesService) {
    this.currentState = connectionService.getCurrentState();
    this.connectionService.monitor().subscribe((currentState: ConnectionState) => {
      console.log('#43 DataService network status has changed', { currentState });
      this.currentState = currentState;
    });
  }

  getSelectedRoom() {

  }

  async getUserAssignedInventories(uid: number): Promise<DBDIInventuren[]>  {
    console.log('#52 getUserAssignedInventories loadUserAssignedInventories');
    let userInventuren: DBDIInventuren[] = [];

    if (this.currentState.hasInternetAccess) {
      console.log('#56 getUserAssignedInventories loadUserAssignedInventories');
      await this.loadUserAssignedInventories();
    } else {
      console.log(
        '#59 getUserAssignedInventories no InternetAccess. Cannot call loadUserAssignedInventories',
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

    const db = this.dexie;
    const api = this.api;

    db.stopClientLogForServerLoad = true;
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
        .then( list => Promise.all( list.map( (item: DBDIInventuren) => db.inventuren.put(item) ) ) )

    ])
      .then( async (results) => {
        const authUser = results[0];
        const invUser = results[1];
        const mandantenRslt = results[2];
        const gebaeudeRslt = results[3];
        const inventurenRslt = results[4];
        console.log({ results });

        const del = await db.inventurenUser.where('uid').equals(authUser.id).delete();
        await invUser.map((item: DBDIInventurenUser) => db.inventurenUser.add(item));
        console.log('Finished loading user-inventories');
        return true;
      })
      .finally( () => {
        db.stopClientLogForServerLoad = false;
      });
  }

  async loadClientList(): Promise<any> {
    return this.api
      .get<any>( 'api/mandant')
      .subscribe( (list: DBDIMandanten[]) => {
        console.log( 'SelectInventoryComponent', 'loadClientList', {list });

        this.dexie.stopClientLogForServerLoad = true;
        const asyncJobs: Promise<void|number>[] = [];
        asyncJobs.push(this.dexie.mandanten.clear());
        list.forEach( (item: DBDIMandanten) => {
          console.log({ called: 'loadClientList', item });
          asyncJobs.push( this.dexie.mandanten.put(item) );
        });
        Promise.all( asyncJobs ).finally( () => { this.dexie.stopClientLogForServerLoad = false; } );
      });
  }

  async loadGebaeudeListByClientId(mid: number): Promise<boolean> {
    await this.api
      .get<any>( 'api/mandant/' + mid + '/gebaeude')
      .subscribe( (list: DBDIGebaeude[]) => {
        console.log( 'SelectInventoryComponent', 'loadClientList', {list });

        this.dexie.stopClientLogForServerLoad = true;
        this.dexie.gebaeude.where('mid').equals(mid)
          .delete()
          .then( () => {
            return list.map( (item: DBDIGebaeude) => {
              console.log({ called: 'loadGebaeudeList', item });
              return this.dexie.gebaeude.put(item);
            });
          })
          .finally( () => {
            this.dexie.stopClientLogForServerLoad = false;
          });
      });

    return true;
  }

  loadRaeumeListByGebaeudeId(gid: number): void {
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.stopClientLogForServerLoad = true;
      this.dexie.raeume
        .where('gid').equals(gid)
        .delete()
        .then( (nr) => list.map( (item: DBDIRaeume) => {
          console.log({ called: 'loadClientList', item });
          return this.dexie.raeume.put(item);
        })
        )
        .finally( () => {
          this.dexie.stopClientLogForServerLoad = false;
        });
    });
  }

  loadInventar(gid: number): void {
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.stopClientLogForServerLoad = true;
      return this.dexie.raeume.where('gid').equals(gid)
        .delete()
        .then( (nr: number) => {
          return list.map( (item: DBDIRaeume) => {
            console.log({ called: 'loadClientList', item });
            return this.dexie.raeume.put(item);
          });
        })
        .finally( () => {
          this.dexie.stopClientLogForServerLoad = false;
        });
      });
  }

  async loadInventurDataByInventurId(id: number): Promise<LoadApiDataResult[]> {
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

    this.dexie.stopClientLogForServerLoad = true;
    return await Promise
      .all([
        this.loadTableDataByUrl<DBDIGebaeude>(
          'gebaeude', `api/inventur/${id}/gebaeude`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIRaeume>(
          'raeume', `api/inventur/${id}/raeume`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIHersteller>(
           'hersteller', `api/inventur/${id}/hersteller`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIImages>(
          'images', `api/inventur/${id}/images`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIInventar>(
          'inventar', `api/inventur/${id}/inventar`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIObjektKatalogGlobal>(
          'objektKatalogGlobal', `api/inventur/${id}/katalog`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIObjektKatalogMandant>(
          'objektKatalogMandant', `api/inventur/${id}/artikelids`, tblStatus, { jobid: id }),
        this.loadTableDataByUrl<DBDIObjektbuchBarcodesLookup>(
          'objektbuchBarcodesLookup', `api/inventur/${id}/objektbuchLookup`, tblStatus, { jobid: id })
      ])
      .finally( () => {
        this.dexie.stopClientLogForServerLoad = false;
      });
  }

  async loadTableDataByUrl<T>(table: string, url: string, cbTblStatus?: any, options?: any): Promise<LoadApiDataResult> {
    if (cbTblStatus) {
      cbTblStatus(table, 'downloading');
    }
    const jobid = options.jobid;
    const lastLoadAttempt = `${table}-${jobid}-download-attempt`;
    const lastLoadSuccess = `${table}-${jobid}-download-success`;
    const lastLoadEntries = `${table}-${jobid}-download-entries`;
    this.settingsService.set(lastLoadAttempt, new Date());

    console.log({ function: 'loadTableDataByUrl', table, url, cbTblStatus, options });
    let inserts = 0;
    let total = 0;

    return await this.api.get<any>( url).toPromise()
      .then( (data: ApiCollectionDataResponse<T>) => {
        console.log('Retrieved Data ', table, ' for processing!');
        this.settingsService.set(lastLoadSuccess, new Date());
        this.settingsService.set(lastLoadEntries, data.rows.length);
        if (cbTblStatus) {
          cbTblStatus(table, 'process import ' + data.rows.length);
          cbTblStatus(table, 'total: ' + data.rows.length);
        }

        inserts = 0;
        total = data.rows.length;
        const stepSize = parseInt((data.rows.length / 10).toString(), 10);

        const asyncJobs: Promise<any>[] = data.rows.map((item: T, i) => {
          if (table === 'raeume') {
            console.log({called: 'load item' + table, item});
          }
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

        console.log( 'Finished Importprocess Data ', table );

        return {
          success: true,
          errorMsg: '',
          total,
          inserts
        } as LoadApiDataResult;
      });
  }

  async getClient(clientID: number): Promise<DBDIMandanten> | null {
    const clients = await this.getClientList();
    const fclients = clients.filter( client => client.mid === clientID);
    console.log( { clientID, clients, fclients });
    return fclients.length ? fclients[0] : null;
  }

  async getBuilding(bldgID: number, clientID: number): Promise<DBDIGebaeude> | null {
    const bldgs = await this.getBuildingList(clientID);
    const fbldgs = bldgs.filter( bldg => bldg.gid === bldgID);
    console.log( { bldgID, clientID, bldgs, fbldgs });
    return fbldgs.length ? fbldgs[0] : null;
  }

  async getClientList(): Promise<DBDIMandanten[]>  {
    return await this.dexie.mandanten.toArray();
  }

  getFullArtikelData(link: DBDIObjektKatalogMandant, globalData: DBDIObjektKatalogGlobal): DBDIArtikel {
    return {...link, ...globalData} as DBDIArtikel;
  }

  getFullRaumData(raum: DBDIRaeume, gebaeude: DBDIGebaeude): DBDIRaumGebaeude {
    const raumGebaeudeData: DBDIRaumGebaeude = {...raum, ...gebaeude};
    return raumGebaeudeData;
  }

  getArtikelRefByGcuuidMid(gcuuid: string, mid: number): Promise<DBDIObjektKatalogMandant> {
    return this.dexie.objektKatalogMandant.where( { gcuuid, mid } ).first();
  }

  public async getArtikelRef(mcid: number): Promise<DBDIObjektKatalogMandant> {
    return this.dexie.objektKatalogMandant.get( mcid );
  }

  public async getArtikelData(gcid: number): Promise<DBDIObjektKatalogGlobal> {
    return this.dexie.objektKatalogGlobal.get( gcid );
  }

  public async getArtikel(id: number): Promise<DBDIArtikel> {
    const artikelLink = await this.dexie.objektKatalogMandant.get( { mcid: id } );
    const artikelData = await this.dexie.objektKatalogGlobal.get( { gcid: artikelLink.gcid } );
    console.log('getArtikel by id', { id, artikelLink, artikelData});
    return this.getFullArtikelData(artikelLink, artikelData);
  }

  public async getArtikelRefAndData(id: number): Promise<ArtikelRefAndData> {
    const artikelRef = await this.dexie.objektKatalogMandant.get( { mcid: id } );
    const artikelData = await this.dexie.objektKatalogGlobal.get( { gcid: artikelRef.gcid } );
    return {
      artikelRef,
      artikelData
    };
  }

  public async getInventarRef(ivid: number): Promise<DBDIInventar> {
    return this.dexie.inventar.get(ivid);
  }

  public async getInventarData(ivid: number): Promise<InventarDataResult> {
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
    console.log('Search in rooms by gid', gid);
    return this.dexie.raeume.where({ gid }).toArray();
  }

  public async getArtikelListByClientId(mid: number): Promise<DBDIArtikel[]> {
    console.log('Search in Global Katalog by mid', mid);

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where({ mid }).toArray();

    const artikelData = await Promise.all(artikelRefs.map( async (ref) => this.dexie.objektKatalogGlobal.get( ref.gcid )));

    return artikelRefs.map( (ref, i) => ({...artikelData[i], ...ref, ...{ mcuuid: ref.uuid }}) );
  }

  public async barcodeLookup(barcode: string, mid: number): Promise<IUnionLookupAssignedObject> {
    console.log('#364 barcodeLookup', {barcode, mid});

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
    const list = await this.dexie.gebaeude.where({mid: clientID}).toArray();
    console.log('#336 async getBuildingList', list);
    return list;
  }

  joinsToStrictFormat(joins: JoinFlexFormatted, parent?: JoinFlexFormatted): JoinStrictFormatted {
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
    let tables: Dexie.Table<any, any>[] = [ join.table ];
    if (join.joins) {
      join.joins.forEach( (jn) => tables = tables.concat( this.joinieTables( jn )) );
    }
    return tables;
  }

  async joinie(flexJoins: JoinFlexFormatted): Promise<any[]|Dexie.Collection<any, any>> {
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


