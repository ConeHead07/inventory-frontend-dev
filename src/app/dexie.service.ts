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
       '++id,table,type,key,jobid,sync_done',
      devices:
       '++id,name,user_agent',
      gebaeude:
       '++gid,mid,mandanten_id,Gebaeude,Adresse',
      hersteller:
       '++hid,Hersteller,created_at,created_uid,created_jobid,created_device_id',
      images:
        '++id,uuid,name,type,size,width,height,gcuuid,url,created_jobid,modified_jobid',
      inventar:
        '++ivid,mcid,uuid,mcuuid,code,[rid+jobid],rid,rid_alt,rid_neu,jobid,invid,iv_nr',
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
       'GeraetNr,FibuNr,Flaeche,Gewicht,Baujahr,Kst',
      objektKatalogMandant:
       '++mcid,uuid,gcid,gcuuid,code,mid',
      raeume:
       '++rid,gid,uuid,hash,code,raumid,Raum,Raumbezeichnung,Etage,current_jobid,current_jobstatus',
      uploads:
       '++id,uuid,mid,standort,importkey,filename,filesize,checksum,stat,errors',
      users:
       '++id,name,email,password',
      objektbuchBarcodesLookup:
        '&code',
      variables:
        '&name,value',
      barcodeLookup:
        '&code,table,updateHelper,[table+updateHelper]'
    });
    this.version(12).stores({
      hersteller:
        '++hid,uuid,Hersteller,created_at,created_uid,created_jobid,created_device_id',
      objektKatalogGlobal:
        '++gcid,uuid,hash,code,hid,huuid,lid,Bezeichnung,Produktnr,Typ,Gruppe,Kategorie,Farbe,Groesse,AnlagenNr,' +
        'GeraetNr,FibuNr,Flaeche,Gewicht,Baujahr,Kst',
    });
    this.version(13).stores({
      raeume:
        '++rid,gid,[rid+gid],uuid,hash,code,raumid,Raum,Raumbezeichnung,Etage,current_jobid,current_jobstatus'
    });

    const validLogTables = [
      'hersteller',
      'inventar',
      'images',
      'objektKatalogGlobal',
      'objektKatalogMandant',
      'raeume'
    ];

    this.on( 'changes', changes => {
       if (this.stopClientLogForServerLoad) {
         console.log('Change is disable for Server-Load');
         return;
       }
       changes.forEach( change => {

         if (validLogTables.indexOf(change.table) === -1 || change.table === this.clientChangeLog.name) {
           console.log('Change is disabled for table ', change.table);
           return;
         }
         console.log('Write ChangeLog for table ', change.table, { change });

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

export interface DBDITableWithBarcode {
  code?: string;
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

export interface DBDIInventar extends DBDITableWithBarcode {
  ivid?: number;
  mcid: number;
  uuid?: string;
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
}

export interface DBDIObjektKatalogMandant extends DBDITableWithBarcode {
  mcid?: number;
  uuid?: string;
  gcid?: number;
  gcuuid?: string;
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

export interface DBDIRaeume extends DBDITableWithBarcode {
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
  current_jobstatus?: DBDIRaumEditStatus;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  created_jobid?: number;
  modified_jobid?: number;
}

export interface DBDIImages {
  id?: number;
  uuid: string;
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
