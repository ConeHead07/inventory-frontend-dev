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
  inventurenUser: Dexie.Table<DBDIInventurenUser, number>;
  lieferant: Dexie.Table<DBDILieferant, number>;
  mandanten: Dexie.Table<DBDIMandanten, number>;
  objektKatalogGlobal: Dexie.Table<DBDIObjektKatalogGlobal, number>;
  objektKatalogMandant: Dexie.Table<DBDIObjektKatalogMandant, number>;
  raeume: Dexie.Table<DBDIRaeume, number>;
  uploads: Dexie.Table<DBDIUploads, number>;
  users: Dexie.Table<DBDIUsers, number>;

  dbVersion = 1;

  constructor(private syncClient: DexieSyncClientService, private baseData: BasedataService) {
     super('LocalInventory'); // , { addons: [ relationships ] });
     Dexie.Syncable.registerSyncProtocol('inventorySync', this.syncClient );

     this.version(1).stores({
       clientChangeLog:
         '++id,table,type,key,jobid,sync_done',
       devices:
         '++id,name,user_agent',
       gebaeude:
         '++gid,mid,mandanten_id,Gebaeude,Adresse',
       hersteller:
         '++hid,Hersteller,created_at,created_uid,created_jobid,created_device_id',
       inventar:
         '++ivid,mcid,uuid,hash,code,rid,rid_alt,rid_neu,' +
         'jobid,invid,iv_nr,' +
         'created_at,modified_at,created_uid,modified_uid,' +
         'created_jobid,modified_jobid,' +
         'created_device_id,modified_device_id',
       inventuren:
         '++jobid,mid,gid,Titel,Start,aktiviert,AbgeschlossenAm',
       inventurenUser:
         '++jobid,uid',
       lieferant:
         '++hid,Lieferant',
       mandanten:
         '++mid,Mandant',
       objektKatalogGlobal:
         '++gcid,uuid,hash,code,hid,lid,Bezeichnung,Produktnr,Typ,Gruppe,Kategorie,Farbe,Groesse,AnlagenNr,' +
         'GeraetNr,FibuNr,Flaeche,Gewicht,Baujahr,Kst,' +
         'created_at,modified_at,created_uid,modified_uid,created_jobid,modified_jobid,' +
         'created_device_id,modified_device_id',
       objektKatalogMandant:
         '++mcid,gcid,code,mid,created_at,modified_at,created_uid,modified_uid,' +
         'created_jobid,modified_jobid,' +
         'created_device_id,modified_device_id',
       raeume:
         '++rid,gid,uuid,hash,code,raumid,Raum,Raumbezeichnung,Etage,current_jobid,current_jobstatus',
       uploads:
         '++id,uuid,mid,standort,importkey,filename,filesize,checksum,stat,errors',
       users:
         '++id,name,email,password',

     });
     this.version(2).stores({});

     const validLogTables = [
      'Hersteller',
      'Inventar',
      'ObjektKatalogGlobal',
      'ObjektKatalogMandant',
      'Raeume'
     ];

     this.on( 'changes', changes => {
       changes.forEach( change => {

         if (validLogTables.indexOf(change.table) === -1 || change.table === this.clientChangeLog.name) {
           return;
         }

         const chlog = {
           timestamp: new Date(),
           table: change.table,
           type: change.type,
           key: change.key,
           mid: this.baseData.getCurrentMid(),
           uid: this.baseData.getCurrentUid(),
           jobid: this.baseData.getCurrentJobid(),
           sync_attempts: 0,
           sync_done: 0
         } as DBDIClientChangeLog;

         switch ( change.type ) {
           case DatabaseChangeType.Create:
             const createChange = change as ICreateChange;
             chlog.obj = createChange.obj;
             console.log('An object was created: ' + JSON.stringify(createChange.obj) );
             break;

           case DatabaseChangeType.Update:
             const updateChange = change as IUpdateChange;
             chlog.mods = updateChange.mods;
             console.log('An object was updated with ' + change.key + ': ' + JSON.stringify(updateChange.mods) );
             break;

           case DatabaseChangeType.Delete:
             const deleteChange = change as IDeleteChange;
             console.log('An object was updated with ' + change.key + ': ' + JSON.stringify(deleteChange) );
             break;
         }
         this.clientChangeLog.add( chlog );
       });
     });
  }
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
  Hersteller: string;
  created_at?: Date;
  updated_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
}

export interface DBDIInventar {
  ivid?: number;
  mcid: number;
  uuid?: string;
  hash?: string;
  code?: string;
  rid: number;
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

export interface DBDIInventurenUser {
  jobid: number;
  uid: number;
}

export interface DBDILieferant {
  hid: number;
  Lieferant: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DBDIMandanten {
  mid: number;
  Mandant: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIObjektKatalogGlobal {
  gcid?: number;
  uuid?: string;
  hash?: string;
  code?: string;
  hid?: number;
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
}

export interface DBDIObjektKatalogMandant {
  mcid?: number;
  gcid?: number;
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
}

export interface DBDIRaeume {
  rid?: number;
  gid: number;
  uuid?: string;
  hash?: string;
  code?: string;
  raumid: string;
  Raum: string;
  Raumbezeichnung?: string;
  Etage?: string;
  current_jobid?: number;
  current_jobstatus?: number;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  created_jobid?: number;
  modified_jobid?: number;
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

/**
 * END SQL-GENERATED Interfaces
 */

export interface DBDIArtikel extends DBDIObjektKatalogMandant, DBDIObjektKatalogGlobal {}

export interface DBDIRaumGebaeude extends DBDIRaeume, DBDIGebaeude {}

export enum LookupResultType {
  NoMatch,
  Inventar,
  Raum
}

export interface LookupResult {
  type: LookupResultType;
}

export interface LookupNoMatches extends LookupResult {
  type: LookupResultType.NoMatch;
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

export type IUnionLookupAssignedObject = LookupAssignedInventar | LookupAssignedRoom | LookupNoMatches;
