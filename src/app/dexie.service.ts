import {Injectable} from '@angular/core';
import Dexie from 'dexie';
import 'dexie-observable';
import 'dexie-syncable';
import relationships from 'dexie-relationships';  // import dexieRelationships from 'dexie-relationships';
import {DatabaseChangeType, IDatabaseChange, ICreateChange, IDeleteChange, IUpdateChange} from 'dexie-observable/api';


import { DexieSyncClientService } from './dexie-sync-client.service';
import {BasedataService} from './basedata.service';

// Dexie.addons.push( dexieRelationships );
Dexie.addons.push( relationships );

@Injectable({
  providedIn: 'root'
})
export class DexieService extends Dexie {

  clientChangeLog: Dexie.Table<DBDIClientChangeLog, number>;
  devices: Dexie.Table<DBDIDevices, number>;
  gebaeude: Dexie.Table<DBDIGebaeude, number>;
  hersteller: Dexie.Table<DBDIHersteller, number>;
  inventar: Dexie.Table<DBDIInventar, number>;
  inventuren: Dexie.Table<DBDIInventuren, number>;
  inventurenGebaeude: Dexie.Table<DBDIInventurenGebaeude, [number, number, number]>;
  inventurenUser: Dexie.Table<DBDIInventurenUser, number>;
  lieferant: Dexie.Table<DBDILieferant, number>;
  mandanten: Dexie.Table<DBDIMandanten, number>;
  objektKatalogGlobal: Dexie.Table<DBDIObjektKatalogGlobal, number>;
  objektKatalogMandant: Dexie.Table<DBDIObjektKatalogMandant, number>;
  raeume: Dexie.Table<DBDIRaeume, number>;
  images: Dexie.Table<DBDIImages, number>;
  uploads: Dexie.Table<DBDIUploads, number>;
  users: Dexie.Table<DBDIUsers, number>;
  objektbuchBarcodesLookup: Dexie.Table<DBDIObjektbuchBarcodesLookup, number>;

  barcodeLookup: Dexie.Table<DBDIBarcodeLookup, string>;
  variables: Dexie.Table<DBDIVariables, string>;

  dbVersion = 1;
  stopClientLogForServerLoad = false;

  constructor(private syncClient: DexieSyncClientService, private baseData: BasedataService) {
    super('merTensIventory'); // , { addons: [ relationships ] });
    Dexie.Syncable.registerSyncProtocol('inventorySync', this.syncClient );

    const DXVersion = this.version(11).stores({
      clientChangeLog:
       '++id,table,type,key,uuid,jobid,sync_done',
      devices:
       '++id,name,user_agent',
      gebaeude:
       '++gid,mid,Gebaeude',
      hersteller:
       '++hid,uuid,Hersteller,for_jobid,created_jobid',
      images:
        '++id,uuid,name,type,size,width,height,gcuuid,url,for_jobid,created_jobid,modified_jobid',
      inventar:
        '++ivid,mcid,uuid,for_jobid,mcuuid,code,[rid+jobid],rid,rid_alt,rid_neu,jobid,invid,iv_nr',
      inventuren:
       '++jobid,mid,gid,Titel,Start,aktiviert,AbgeschlossenAm',
      inventurenGebaeude:
        '[jobid+gid+uid],jobid,gid,uid',
      inventurenUser:
        'jobid,uid',
      lieferant:
       '++hid,Lieferant',
      mandanten:
       '++mid,Mandant',
      objektKatalogGlobal:
       '++gcid,uuid,code,hid,Bezeichnung,Typ,Gruppe,Kategorie,Farbe,Groesse,created_jobid',
      objektKatalogMandant:
       '++mcid,uuid,gcid,gcuuid,code,mid,for_jobid,created_jobid',
      raeume:
       '++rid,gid,[rid+gid],uuid,for_jobid,code,raumid,Raum,Raumbezeichnung,Etage,current_jobid,current_jobstatus',
      uploads:
       '++id,uuid,mid,standort,importkey,filename,filesize,checksum,stat,errors',
      users:
       '++id,name,email,password',
      objektbuchBarcodesLookup:
        '&code,for_jobid',
      variables:
        '&name,value',
      barcodeLookup:
        '&code,table,for_jobid,[table+for_jobid],updateHelper,[table+updateHelper]'
    });
    // Now, add another version, just to trigger an upgrade for Dexie.Observable
    this.version(2).stores({}); // No need to add / remove tables. This is just to allow the addon to install its tables.

    const validLogTables = [
      'hersteller',
      'inventar',
      'images',
      'objektKatalogGlobal',
      'objektKatalogMandant',
      'raeume'
    ];

    this.on( 'changes', (changes, partial) => {
       // console.log('#145 dexie.service on changes: changes.length', changes.length, partial, { changes});
       if (this.stopClientLogForServerLoad) {
         // console.log('#145 dexie.service on changes: is disabled for Server-Load');
         return;
       }
       changes.forEach( (change: IDatabaseChange) => {

         if (validLogTables.indexOf(change.table) === -1 || change.table === this.clientChangeLog.name) {
           // console.log('#151 dexie.service on changes: ChangeLog disabled for table ', change.table);
           return;
         }
         console.log('#154 dexie.service on changes: Write ChangeLog for table ', change.table, change.key, 'partial', partial);

         this.addChangeLog( change );
       });
     });
  }

  async addChangeLog(change: IDatabaseChange) {
    const log = this.getChangeLogFlag(change);
    if (log === undefined || !log) {
      return;
    }
    let uuid = this.getChangeLogUuid(change);

    if (change.type !== 3) {
      const obj: any = await this.table( change.table ).get( change.key );
      uuid = ('uuid' in obj) ? obj.uuid : '';

      console.log('Remove LogFlag from Entry ' + change.table + ' with id ' + change.key);
      delete obj.log;
      await this.table( change.table ).put( obj, change.key);
    }

    const chlog = {
      timestamp: new Date(),
      table: change.table,
      type: change.type,
      key: change.key,
      uuid,
      mid: this.baseData.getCurrentMid(),
      uid: this.baseData.getCurrentUid(),
      jobid: this.baseData.getCurrentJobid(),
      sync_attempts: 0,
      sync_done: 0
    } as DBDIClientChangeLog;

    switch ( change.type ) {
      case DatabaseChangeType.Create:
        if ('log' in change.obj) {
          delete change.obj.log;
        }
        chlog.obj = change.obj;
        console.log('#141 dexie.service on changes: An object was created: ', change.table, change.key, { chlog } );
        break;

      case DatabaseChangeType.Update:
        const updateChange = change as IUpdateChange;
        chlog.mods = updateChange.mods;
        if ('log' in chlog.mods) {
          delete chlog.mods.log;
        }
        console.log('#211 dexie.service on changes: An object was updated: ', change.table, change.key, change.mods, { chlog } );
        break;

      case DatabaseChangeType.Delete:
        const deleteChange = change as IDeleteChange;
        console.log('#145 dexie.service on changes: ABORT! We dont log Deletess: ', change.table, change.key, deleteChange);
        return;
        break;
    }
    this.clientChangeLog.add( chlog );
  }

  getChangeLogUuid(change: IDatabaseChange): string|undefined {
    const ch = change as any;
    if ( ('obj' in ch) && ('uuid' in ch.obj)) {
      return ch.obj.uuid;
    }
    if ( ('mods' in ch) && ('uuid' in ch.mods)) {
      return ch.mods.uuid;
    }
    if ( ('oldObj' in ch) && ('uuid' in ch.oldObj)) {
      return ch.oldObj.uuid;
    }
    return undefined;
  }

  getChangeLogFlag(change: IDatabaseChange): boolean|undefined {
    const ch = change as any;
    if ( typeof ch !== 'object') {
      console.error('#192 dexie.service getChangeLog(change) change is not a object: ', change);
      return false;
    }

    if ( (typeof ch.obj === 'object') && ('log' in ch.obj) ) {
      return !!ch.obj.log;
    }

    if ( (typeof ch.mods === 'object') && ('log' in ch.mods)) {
      return !!ch.mods.log;
    }

    if ( (typeof ch.oldObj === 'object') && ('log' in ch.oldObj)) {
      return !!ch.oldObj.log;
    }
    return undefined;
  }

  stopChangeLogForImport( stop: boolean) {
    console.log('#199 stopClientLogForServerLoad => ', stop);
    this.stopClientLogForServerLoad = stop;
  }
}

export interface DBDITableWithBarcode {
  code?: string;
  uuid?: string;
  for_jobid?: number;
}

export enum DBDIRaumEditStatus {
  Init = 0,
  Started = 1,
  Closed = 2
}
/**
 * @PREFIX DBDI DataBasaDataInterface
 */
export interface DBDIClientChangeLog {
  id?: number;
  jobid?: number;
  timestamp: Date;
  table: string;
  type: number;
  key: number;
  uuid?: string;
  obj?: any;
  oldObj?: any;
  mods?: any;
  mid?: number;
  uid?: number;
  devid?: string;
  sync_attempts?: number;
  sync_lastattempt?: Date;
  sync_time?: Date;
  sync_done: number;
}

export interface DBDIDevices {
  id?: number;
  name: string;
  user_agent?: string;
  created_uid: string;
  created_at: Date;
  modified_uid?: string;
  modified_at?: Date;
}

export interface DBDIGebaeude {
  gid: number;
  mid: number;
  mandanten_id: number;
  Gebaeude: string;
  Adresse: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIHersteller {
  hid?: number;
  uuid?: string;
  for_jobid?: number;
  Hersteller: string;
  created_at?: Date;
  updated_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIInventar extends DBDITableWithBarcode {
  ivid?: number;
  mcid: number;
  uuid?: string;
  for_jobid?: number;
  mcuuid?: string;
  hash?: string;
  code?: string;
  rid: number;
  ruuid?: number;
  rid_alt?: number;
  rid_neu?: number;
  Bezeichnung?: string;
  Typ?: string;
  Kategorie?: string;
  Farbe?: string;
  Groesse?: string;
  Zustand?: string;
  Seriennr?: string;
  jobid: number;
  invid?: string;
  iv_nr?: string;
  ErsteAufnahmeAm?: Date;
  LetzteAufnahmeAm?: Date;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIInventuren {
  jobid: number;
  mid?: number;
  gid?: number;
  Titel: string;
  Start: Date;
  aktiviert: number;
  AbgeschlossenAm?: Date;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIInventurenGebaeude {
  jobid: number;
  gid: number;
  uid?: number;
}

export interface DBDIInventurenUser {
  jobid: number;
  uid: number;
}

export interface DBDILieferant {
  hid: number;
  Lieferant: string;
  created_at?: Date;
  updated_at?: Date;
  log?: boolean;
}

export interface DBDIMandanten {
  mid: number;
  Mandant: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIObjektKatalogGlobal extends DBDITableWithBarcode {
  gcid?: number;
  uuid?: string;
  hash?: string;
  code?: string;
  hid?: number;
  huuid?: string;
  lid?: number;
  Bezeichnung?: string;
  Produktnr?: string;
  Typ?: string;
  Gruppe?: string;
  Kategorie?: string;
  Farbe?: string;
  Groesse?: string;
  Bild?: string;
  AnlagenNr?: string;
  GeraetNr?: string;
  FibuNr?: string;
  Flaeche?: string;
  Gewicht?: string;
  Baujahr?: string;
  Kst?: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIObjektKatalogMandant extends DBDITableWithBarcode {
  mcid?: number;
  uuid?: string;
  gcid?: number;
  gcuuid?: string;
  for_jobid?: number;
  code?: string;
  mid: number;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIRaeume extends DBDITableWithBarcode {
  rid?: number;
  gid: number;
  uuid?: string;
  for_jobid?: number;
  hash?: string;
  code?: string;
  raumid: string;
  Raum: string;
  Raumbezeichnung?: string;
  Etage?: string;
  current_jobid?: number;
  current_jobstatus?: DBDIRaumEditStatus;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  created_jobid?: number;
  modified_jobid?: number;
  log?: boolean;
}

export interface DBDIImages {
  id?: number;
  uuid: string;
  for_jobid?: number;
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
  gcuuid: string;
  url?: string;
  data_binary?: string;
  data_url?: string;
  revnr: number;
  created_at: Date;
  created_uid: number;
  created_jobid: number;
  modified_at?: Date;
  modified_uid?: number;
  modified_jobid?: number;
  log?: boolean;
}

export interface DBDIUploads {
  id: number;
  uuid?: string;
  mid: number;
  standort?: string;
  importkey?: string;
  filename?: string;
  filesize?: number;
  checksum?: string;
  content?: string;
  stat?: string;
  errors?: string;
  created_at: Date;
  created_uid?: number;
  modified_at?: Date;
  modified_uid?: number;
}

export interface DBDIUsers {
  id: number;
  name: string;
  email: string;
  password: string;
  remember_token?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DBDIObjektbuchBarcodesLookup {
  code: string;
  table: string;
  key: string;
  id: number;
  uuid: string;
  for_jobid: number;
  updateHelper: number;
}

/**
 * END SQL-GENERATED Interfaces
 */
export interface DBDIVariables {
  name: string;
  value?: any;
}

export interface DBDIBarcodeLookup {
  code: string;
  table: string;
  key: string;
  id?: number;
  uuid: string;
  for_jobid?: number;
  updateHelper?: number;
}

export enum LookupResultTable {
  None,
  Any,
  Inventar,
  Raeume,
  ObjektKatalogGlobal,
  ObjektKatalogMandant,
  Objektbuch
}

export interface BarcodeLookupSimpleResult {
  barcode: string;
  foundRef?: DBDIBarcodeLookup;
  success: boolean;
  lookupResultTable: LookupResultTable;
  data: null|DBDIInventar|DBDIObjektKatalogGlobal|DBDIObjektKatalogMandant|DBDIRaeume|DBDIObjektbuchBarcodesLookup;
  inventar?: DBDIInventar;
  gebaeude?: DBDIGebaeude;
  raum?: DBDIRaeume;
  artikelData?: DBDIObjektKatalogGlobal;
  artikelRef?: DBDIObjektKatalogMandant;
  image?: DBDIImages;
}

export interface DBDIArtikel extends DBDIObjektKatalogMandant, DBDIObjektKatalogGlobal {
  mcuuid?: string;
}

export interface DBDIRaumGebaeude extends DBDIRaeume, DBDIGebaeude {}

export enum LookupResultType {
  NoMatch,
  Inventar,
  Raum,
  ObjektBuchArtikel,
  ObjektBuchRaum
}

export interface LookupResult {
  type: LookupResultType;
  count?: number;
}

export interface LookupNoMatches extends LookupResult {
  type: LookupResultType.NoMatch;
  count?: 0;
}

export interface LookupAssignedObjektbuchArtikel extends LookupResult {
  type: LookupResultType.ObjektBuchArtikel;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface LookupAssignedObjektbuchRaum extends LookupResult {
  type: LookupResultType.ObjektBuchRaum;
  raum: DBDIRaeume;
  gebaeude: DBDIGebaeude;
}

export interface LookupAssignedInventar extends LookupResult {
  type: LookupResultType.Inventar;
  inventar: DBDIInventar;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface LookupAssignedRoom extends LookupResult {
  type: LookupResultType.Raum;
  raum: DBDIRaeume;
  gebaeude: DBDIGebaeude;
}

export type IUnionLookupAssignedObject = LookupAssignedInventar |
  LookupAssignedRoom |
  LookupAssignedObjektbuchArtikel |
  LookupAssignedObjektbuchRaum |
  LookupNoMatches;
