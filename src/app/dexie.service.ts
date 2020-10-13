import {Injectable} from '@angular/core';
import Dexie from 'dexie';
import 'dexie-observable';
import 'dexie-syncable';
import relationships from 'dexie-relationships';  // import dexieRelationships from 'dexie-relationships';
import {DatabaseChangeType, IDatabaseChange, ICreateChange, IDeleteChange, IUpdateChange} from 'dexie-observable/api';


import { DexieSyncClientService } from './dexie-sync-client.service';
import {BasedataService} from './basedata.service';
import {
  DBDIBarcodeLookup,
  DBDIClientChangeLog,
  DBDIDevices, DBDIGebaeude, DBDIHersteller, DBDIImages,
  DBDIInventar, DBDIInventuren, DBDIInventurenGebaeude, DBDIInventurenUser,
  DBDILieferant, DBDIMandanten, DBDIObjektbuchBarcodesLookup,
  DBDIObjektKatalogGlobal, DBDIObjektKatalogMandant, DBDIRaeume, DBDIUploads, DBDIUsers, DBDIVariables
} from './dexie.interfaces';

const database = 'merTensIventory';
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
  inventurenUser: Dexie.Table<DBDIInventurenUser, [number, number]>;
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
    super( database ); // , { addons: [ relationships ] });
    this.init();
  }

  async clearDB(): Promise<boolean> {
    console.log('clear db');
    return Promise.all(this.tables.map( (t) => t.clear() ))
      .then( () => {
        console.log('clear db finished');
        return true;
      }).catch( (r) => {
        console.error(r);
        return false;
      });
  }

  init() {
    Dexie.Syncable.registerSyncProtocol('inventorySync', this.syncClient );

    this.version(11).stores({
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
        '++ivid,mcid,uuid,for_jobid,mcuuid,code,[rid+jobid],rid,rid_init,rid_neu,jobid,invid,iv_nr',
      inventuren:
       '++jobid,mid,gid,Titel,Start,aktiviert,AbgeschlossenAm',
      inventurenGebaeude:
        '[jobid+gid+uid],jobid,gid,uid',
      inventurenUser:
        '&[jobid+uid],jobid,uid',
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
    this.version(3).stores({
      barcodeLookup:
        '&[code+for_jobid],table,for_jobid,[table+for_jobid],updateHelper,[table+updateHelper]'
    }); // No need to add / remove tables. This is just to allow the addon to install its tables.
    this.version(4).stores({
      inventurenUser:
        '&[jobid+uid],jobid,uid'
    });

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
