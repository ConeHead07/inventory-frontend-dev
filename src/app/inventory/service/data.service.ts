import {Injectable} from '@angular/core';
import {ApiService} from '../../api.service';
import {
  DBDIArtikel,
  DBDIGebaeude,
  DBDIInventar,
  DBDIInventuren,
  DBDIInventurenUser,
  DBDIMandanten,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant,
  DBDIRaeume,
  DBDIRaumGebaeude,
  DexieService,
  IUnionLookupAssignedObject,
  LookupAssignedInventar, LookupAssignedRoom,
  LookupNoMatches,
  LookupResultType
} from '../../dexie.service';
import {User} from '../../auth/user.model';
import {ConnectionService, ConnectionState} from '../../connection-service.service';

export interface LoadApiDataResult {
  success: boolean;
  errorMsg?: string;
  total?: number;
  inserts?: number;
  debug?: any;
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
@Injectable({
  providedIn: 'root'
})
export class DataService {

  currentState: ConnectionState;

  constructor(
    private api: ApiService,
    private dexie: DexieService,
    private connectionService: ConnectionService) {
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
    let meAuthUser: User;
    let inventurenUser: DBDIInventurenUser[] = [];

    // jobidsByAuthUser
    await Promise.all([
      this.api.get<any>( 'auth/me').toPromise().then( (usr: User) => {
        meAuthUser = usr;
      }),
      this.api.get<DBDIInventurenUser[]>( 'api/inventur/jobidsByAuthUser').toPromise().then( (list: DBDIInventurenUser[]) => {
        inventurenUser = list;
      }),
      this.api.get<DBDIMandanten[]>( 'api/inventur/clientsByAuthUser').toPromise().then( (list: DBDIMandanten[]) => {
        list.forEach( item => {
          console.log('add mandant to db', { item});
          this.dexie.mandanten.put( item );
        });
      }),
      this.api.get<DBDIGebaeude[]>( 'api/inventur/gebaeudeByAuthUser').toPromise().then( (list: DBDIGebaeude[]) => {
        list.forEach( item => {
          console.log('add gebaeude to db', { item});
          this.dexie.gebaeude.put( item );
        });
      }),
      this.api.get<DBDIInventuren[]>( 'api/inventur/listByAuthUser').toPromise().then( (list: DBDIInventuren[]) => {
        list.forEach( (item: DBDIInventuren) => {
          this.dexie.inventuren.put(item);
        });
      })
    ]);

    await this.dexie.inventurenUser.where('uid').equals(meAuthUser.id).delete();
    inventurenUser.forEach( (item: DBDIInventurenUser) => {
      this.dexie.inventurenUser.add(item);
    });

    return true;
  }

  async loadClientList(): Promise<any> {
    return this.api.get<any>( 'api/mandant').subscribe( (list: DBDIMandanten[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.mandanten.clear();
      list.forEach( (item: DBDIMandanten) => {
        console.log({ called: 'loadClientList', item });
        this.dexie.mandanten.put(item);
      });
    });
  }

  async loadGebaeudeListByClientId(mid: number): Promise<boolean> {
    await this.api.get<any>( 'api/mandant/' + mid + '/gebaeude').subscribe( (list: DBDIGebaeude[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.gebaeude.where('mid').equals(mid)
        .delete()
        .then( () => {
          list.forEach( async (item: DBDIGebaeude) => {
            console.log({ called: 'loadGebaeudeList', item });
            await this.dexie.gebaeude.put(item);
          });
        });
    });

    return true;
  }

  loadRaeumeListByGebaeudeId(gid: number): void {
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.raeume.where('gid').equals(gid).delete();
      list.forEach( (item: DBDIRaeume) => {
        console.log({ called: 'loadClientList', item });
        this.dexie.raeume.put(item);
      });
    });
  }

  loadInventar(gid: number): void {
    this.api.get<any>( 'api/gebaeude/' + gid + '/raeume').subscribe( (list: DBDIRaeume[]) => {
      console.log( 'SelectInventoryComponent', 'loadClientList', {list });

      this.dexie.raeume.where('gid').equals(gid).delete();
      list.forEach( (item: DBDIRaeume) => {
        console.log({ called: 'loadClientList', item });
        this.dexie.raeume.put(item);
      });
    });
  }

  async loadInventurDataByInventurId(id: number): Promise<LoadApiDataResult[]> {
    const tables = {
      gebaeude: 'pending',
      raeume: 'pending',
      inventar: 'pending',
      objektkatalogglobal: 'pending',
      objektkatalogmandant: 'pending'
    };
    const tblStatus = (table, status) => {
      tables[ table ] = status;
      console.log( tables );
    };

    return await Promise.all([
      this.loadTableDataByUrl<DBDIGebaeude>( 'gebaeude', `api/inventur/${id}/gebaeude`, tblStatus),
      this.loadTableDataByUrl<DBDIRaeume>( 'raeume', `api/inventur/${id}/raeume`, tblStatus),
      this.loadTableDataByUrl<DBDIInventar>( 'inventar', `api/inventur/${id}/inventar`, tblStatus),
      this.loadTableDataByUrl<DBDIObjektKatalogGlobal>( 'objektKatalogGlobal', `api/inventur/${id}/katalog`, tblStatus),
      this.loadTableDataByUrl<DBDIObjektKatalogMandant>( 'objektKatalogMandant', `api/inventur/${id}/artikelids`, tblStatus)
    ]);
  }

  async loadTableDataByUrl<T>(table: string, url: string, cbTblStatus?: any, options?: object): Promise<LoadApiDataResult> {
    if (cbTblStatus) {
      cbTblStatus(table, 'downloading');
    }

    console.log({ function: 'loadTableDataByUrl', table, url, cbTblStatus, options });

    return await this.api.get<any>( url).toPromise().then( (data: ApiCollectionDataResponse<T>) => {
      console.log( 'Retrieved Data ', table, ' for processing!');
      if (cbTblStatus) {
        cbTblStatus(table, 'process import ' + data.rows.length );
        cbTblStatus(table, 'total: ' + data.rows.length );
      }

      let inserts = 0;
      const total = data.rows.length;
      const stepSize = parseInt((data.rows.length / 10).toString(), 10);

      data.rows.forEach( (item: T, i) => {
        if (table === 'raeume') {
          console.log({ called: 'load item' + table, item });
        }
        if (  ( ( i + 1 ) % stepSize === 0 || (i + 1) === total) && cbTblStatus ) {
          cbTblStatus(table, i + 1);
        }
        this.dexie.table( table ).put(item);
        inserts += 1;
      });
      console.log( 'Finished Importprocess Data ', table );

      if (cbTblStatus) {
        cbTblStatus(table, 'finished');
      }

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
    return {...globalData, ...link} as DBDIArtikel;
  }

  getFullRaumData(raum: DBDIRaeume, gebaeude: DBDIGebaeude): DBDIRaumGebaeude {
    const raumGebaeudeData: DBDIRaumGebaeude = {...raum, ...gebaeude};
    return raumGebaeudeData;
  }

  public async getArtikelRef(mcid: number): Promise<DBDIObjektKatalogMandant> {
    return this.dexie.objektKatalogMandant.get( mcid );
  }

  public async getArtikelData(gcid: number): Promise<DBDIObjektKatalogGlobal> {
    return this.dexie.objektKatalogGlobal.get( gcid );
  }

  public async getArtikel(id: number): Promise<DBDIArtikel> {
    console.log('getArtikel by id', id);
    const artikelLink = await this.dexie.objektKatalogMandant.get( { mcid: id } );
    const artikelData = await this.dexie.objektKatalogMandant.get( { mcid: artikelLink.mcid } );
    return this.getFullArtikelData(artikelLink, artikelData);
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

    const artikelData = await Promise.all(artikelRefs.map( ref => this.dexie.objektKatalogGlobal.get( ref.gcid )));

    return artikelRefs.map( (ref, i) => ({...artikelData[i], ...ref}) );
  }

  public async barcodeLookup(barcode: string, mid: number): Promise<IUnionLookupAssignedObject> {
    console.log('#364 barcodeLookup', {barcode, mid});

    const lookupInventar = await this.getInventarByBarcode(barcode, mid);

    if (lookupInventar.type === LookupResultType.Inventar) {
      return lookupInventar;
    }

    // Otherwise return the Result of Raum-Lookup
    return this.getRaumByBarcode(barcode, mid);
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
    const raumMatches = await db.raeume.where( { code: barcode } ).toArray();

    for (const raum of raumMatches) {
      const gebaeude = await db.gebaeude.get(raum.gid);

      return {
        type: LookupResultType.Raum,
        raum,
        gebaeude
      };
    }

    console.log('#232 barcodeLookup NOT FOUND', { barcode, useMid});
    return { type: LookupResultType.NoMatch };
  }

  async getBuildingList(clientID: number): Promise<DBDIGebaeude[]> {
    const list = await this.dexie.gebaeude.where({mid: clientID}).toArray();
    console.log('#336 async getBuildingList', list);
    return list;
  }
}
