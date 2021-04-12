import {EventEmitter, Injectable, Output} from '@angular/core';
import Dexie from 'dexie';
import 'dexie-observable';
import {DatabaseChangeType, IDatabaseChange, ICreateChange, IDeleteChange, IUpdateChange} from 'dexie-observable/api';

import 'dexie-syncable';

import { DexieSyncClientService } from './dexie-sync-client.service';
import {BasedataService} from './basedata.service';
import {
  DBDIBarcodeLookup,
  DBDIClientChangeLog, DBDIServerSyncErrors,
  DBDIDevices, DBDIGebaeude, DBDIHersteller, DBDIImages,
  DBDIInventar, DBDIInventuren, DBDIInventurenGebaeude, DBDIInventurenUser,
  DBDILieferant, DBDIMandanten, DBDIObjektbuchBarcodesLookup,
  DBDIObjektKatalogGlobal, DBDIObjektKatalogMandant, DBDIObjektKatalogImages,
  DBDIRaeume, DBDIUploads, DBDIUsers, DBDIVariables, DBDIInventurenUserStatus
} from '../interfaces/dexie.interfaces';
import {Guid} from 'guid-typescript';

const database = 'merTensIventory.1';

@Injectable({
  providedIn: 'root'
})
export class DexieService extends Dexie {

  @Output() clientSyncAmountChanged = new EventEmitter<number>();

  barcodeLookup: Dexie.Table<DBDIBarcodeLookup, [string, number]>;
  clientChangeLog: Dexie.Table<DBDIClientChangeLog, number>;
  devices: Dexie.Table<DBDIDevices, number>;
  gebaeude: Dexie.Table<DBDIGebaeude, number>;
  hersteller: Dexie.Table<DBDIHersteller, string>;
  images: Dexie.Table<DBDIImages, string>;
  inventar: Dexie.Table<DBDIInventar, string>;
  inventuren: Dexie.Table<DBDIInventuren, number>;
  inventurenGebaeude: Dexie.Table<DBDIInventurenGebaeude, [number, number, number]>;
  inventurenUser: Dexie.Table<DBDIInventurenUser, [number, number]>;
  inventurenUserStatus: Dexie.Table<DBDIInventurenUserStatus, [number, number, number]>;
  lieferant: Dexie.Table<DBDILieferant, number>;
  mandanten: Dexie.Table<DBDIMandanten, number>;
  objektbuchBarcodesLookup: Dexie.Table<DBDIObjektbuchBarcodesLookup, string>;
  objektKatalogGlobal: Dexie.Table<DBDIObjektKatalogGlobal, string>;
  objektKatalogMandant: Dexie.Table<DBDIObjektKatalogMandant, string>;
  objektKatalogImages: Dexie.Table<DBDIObjektKatalogImages, string>;
  raeume: Dexie.Table<DBDIRaeume, string>;
  serverSyncErrors: Dexie.Table<DBDIServerSyncErrors, number>;
  uploads: Dexie.Table<DBDIUploads, number>;
  users: Dexie.Table<DBDIUsers, number>;
  variables: Dexie.Table<DBDIVariables, string>;

  dbVersion = 12;
  nextDbVersion = 0;
  stopClientLogForServerLoad = false;

  constructor(private syncClient: DexieSyncClientService, private baseData: BasedataService) {
    super( database );
    this.nextDbVersion = this.dbVersion + 1;
    this.on('versionchange', (event: IDBVersionChangeEvent) => {
      console.log('DexieService #62 event versionchange ', { event });
    });
    this.on('message', event => {
      console.log('DexieService #65 event message', { event });
    });
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
    this.nextDbVersion = this.dbVersion + 1;

    this.version(this.dbVersion).stores({
      barcodeLookup:
        '&[code+for_jobid],table,for_jobid,[table+for_jobid],updateHelper,[table+updateHelper]',
      clientChangeLog:
       '++id,table,type,key,uuid,jobid,sync_done',
      devices:
       '++id,name,user_agent',
      gebaeude:
       '++gid,mid,Gebaeude',
      hersteller:
       '$$uuid,hid,Hersteller,for_jobid,created_jobid',
      images:
        '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid,created_jobid,modified_jobid',
      inventar:
        '$$uuid,ivid,mcid,for_jobid,mcuuid,code,[rid+jobid],rid,rid_init,rid_neu,ruuid,jobid,invid,iv_nr',
      inventuren:
       '++jobid,mid,gid,Titel,Start,aktiviert,AbgeschlossenAm',
      inventurenGebaeude:
        '[jobid+gid+uid],jobid,gid,uid',
      inventurenUser:
        '&[jobid+uid],jobid,uid',
      inventurenUserStatus:
        '&[jobid+uid+device_id],jobid,uid,device_id,status,token',
      lieferant:
       '++hid,Lieferant',
      mandanten:
       '++mid,Mandant',
      objektbuchBarcodesLookup:
        '&code,for_jobid',
      objektKatalogGlobal:
       '$$uuid,gcid,code,hid,Bezeichnung,Typ,Gruppe,Kategorie,Farbe,Groesse,created_jobid',
      objektKatalogMandant:
       '$$uuid,mcid,gcid,gcuuid,code,mid,for_jobid,created_jobid',
      objektKatalogImages:
      '$$uuid,id,for_jobid,RefTable,RefUuid,ImgUuid,Kategorie,[RefTable+RefUuid+Kategorie]',
      raeume:
       '$$uuid,rid,gid,[rid+gid],for_jobid,code,raumid,Raum,Raumbezeichnung,Etage,current_jobid,current_jobstatus',
      serverSyncErrors:
        '++id,jobid,clientChangeLogId,table,type,uuid,error_code,error_msg',
      uploads:
       '++id,uuid,mid,standort,importkey,filename,filesize,checksum,stat,errors',
      users:
       '++id,name,email,password',
      variables:
        '&name,value'
    });
    const sleep = (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    };

    if (1) {
      const v2 = this.nextDbVersion;
      this.version(v2).stores({
        images:
          '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid,created_jobid,modified_jobid'
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v2);
        this.images.toCollection().each( (img) => {
          this.objektKatalogMandant.where({mcid: img.mcid}).first().then( (okm) => {
            this.images.where({uuid: img.uuid}).modify({mcuuid: okm.uuid});
          });
        });
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v3 = this.nextDbVersion;
      this.version(v3).stores({
        images:
          '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid,created_jobid,modified_jobid'
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v3);
        this.images.toCollection().each( (img) => {
          this.objektKatalogMandant.where({mcid: img.mcid}).first().then( (okm) => {
            this.images.where({uuid: img.uuid}).modify({mcuuid: okm.uuid});
          });
        });
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v4 = this.nextDbVersion;
      this.version(v4).stores({
        images:
          '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid,created_jobid,modified_jobid'
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v4);
        return trans;
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v5 = this.nextDbVersion;
      this.version(v5).stores({
        objektKatalogGlobal:
          '$$uuid,gcid,code,huuid,Bezeichnung,Typ,Gruppe,Kategorie,Farbe,Groesse,created_jobid',
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v5);
        return trans;
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v6 = this.nextDbVersion;
      this.version(v6).stores({
        objektKatalogGlobal:
          '$$uuid,gcid,code,huuid,Bezeichnung,[Bezeichnung+huuid],Typ,Gruppe,Kategorie,Farbe,Groesse,created_jobid',
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v6);
        return trans;
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v7 = this.nextDbVersion;
      this.version(v7).stores({
        objektKatalogGlobal:
          '$$uuid,uuid,gcid,code,huuid,Bezeichnung,[Bezeichnung+huuid],Typ,Gruppe,Kategorie,Farbe,Groesse,created_jobid',
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v7);
        return trans;
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v8 = this.nextDbVersion;
      this.version(v8).stores({
        images:
          '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid,created_jobid,modified_jobid',
      }).upgrade((trans) => {
        console.log('Starte Upgrade for DB-Version ' + v8);
        return trans;
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v9 = this.nextDbVersion;
      this.version(v9).stores({
        images:
          '$$uuid,id,name,type,size,width,height,gcuuid,mcuuid,url,for_jobid',
      });
      this.nextDbVersion += 1;
    }

    if (1) {
      const v10 = this.nextDbVersion;
      this.version(v10).stores({
        barcodeLookup:
          '&[code+for_jobid],table,for_jobid,[table+for_jobid],[table+for_jobid+updateHelper],updateHelper,[table+updateHelper]',
      });
      this.nextDbVersion += 1;
    }
    if (1) {
      const v11 = this.nextDbVersion;
      this.version(v11).stores({
        objektKatalogImages:
          '$$uuid,id,for_jobid,RefTable,RefUuid,ImgUuid,Kategorie,[RefTable+RefUuid+Kategorie]',
      });
      this.nextDbVersion += 1;
    }


    const validLogTables = [
      'hersteller',
      'inventar',
      'images',
      'objektKatalogGlobal',
      'objektKatalogMandant',
      'objektKatalogImages',
      'raeume'
    ];

    let lastClientChangeLogTimestamp = 0;
    const lastClientChangeLogDelay = 2000;
    let lastClientChangeLogTimer = null;
    const lastClientChangeLogTrigger = () => {
      this.clientChangeLog.count().then( (num) => {
        this.clientSyncAmountChanged.emit(num);
      });
    };
    const checkEmitClientChange = () => {
      const now = Date.now();
      if (lastClientChangeLogTimer) {
        if (now - lastClientChangeLogTimestamp < lastClientChangeLogDelay) {
          return;
        }
        clearTimeout(lastClientChangeLogTimer);
        lastClientChangeLogTimer = null;
      }

      lastClientChangeLogTimestamp = Date.now();
      lastClientChangeLogTimer = setTimeout( lastClientChangeLogTrigger, lastClientChangeLogDelay);
    };

    this.on( 'changes', (changes, partial) => {
      // console.log('#145 dexie.service on changes: changes.length', changes.length, partial, { changes});
      changes.forEach( (change: IDatabaseChange) => {
        if (change.table === 'clientChangeLog') {
          if (change.type === DatabaseChangeType.Update && !('sync_done' in change.mods)) {
            return;
          }
          checkEmitClientChange();
        }
      });

      if (this.stopClientLogForServerLoad) {
        // console.log('#145 dexie.service on changes: is disabled for Server-Load');
        return;
      }
      changes.forEach( (change: IDatabaseChange) => {

        if (validLogTables.indexOf(change.table) === -1 || change.table === this.clientChangeLog.name) {
          // console.log('#151 dexie.service on changes: ChangeLog disabled for table ', change.table);
          return;
        }

        this.addChangeLog( change );
      });
    });
  }

  async addChangeLog(change: IDatabaseChange) {
    const log = this.getChangeLogFlag(change);
    // if (log === undefined || !log) {
    //   console.log('#152 addChangeLog Skip DB-Change-Logging - No Log-Flag', { change });
    //   return;
    // }
    if (log !== undefined && log !== null && log === false) {
      return;
    }
    let uuid = this.getChangeLogUuid(change);

    if (change.type !== 3) {
      const obj: any = await this.table( change.table ).get( change.key );
      uuid = ('uuid' in obj) ? obj.uuid : '';

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
        const insertChange = change as ICreateChange;
        if ('log' in change.obj) {
          delete change.obj.log;
        }
        chlog.obj = change.obj;
        switch (change.table) {
          case 'objektKatalogGlobal':
            if (!('huuid' in chlog.obj)) {
              chlog.obj.huuid = this.getChangeLogProp<string>(change, 'huuid');
            }
            break;

          case 'objektKatalogMandant':
            if (!('gcuuid' in chlog.obj)) {
              chlog.obj.gcuuid = this.getChangeLogProp<string>(change, 'gcuuid');
            }
            break;

          case 'inventar':
            if (!('mcuuid' in chlog.obj)) {
              chlog.obj.mcuuid = this.getChangeLogProp<string>(change, 'mcuuid');
            }
            if (!('ruuid' in chlog.obj)) {
              chlog.obj.ruuid = this.getChangeLogProp<string>(change, 'ruuid');
            }
            break;
        }
        break;

      case DatabaseChangeType.Update:
        const updateChange = change as IUpdateChange;
        chlog.mods = updateChange.mods;
        if ('log' in chlog.mods) {
          delete chlog.mods.log;
        }

        switch (change.table) {
          case 'objektKatalogGlobal':
            if (!('huuid' in chlog.mods)) {
              chlog.mods.huuid = this.getChangeLogProp<string>(change, 'huuid');
            }
            if (!('hid' in chlog.mods)) {
              chlog.mods.hid = this.getChangeLogProp<number>(change, 'hid');
            }
            break;

          case 'objektKatalogMandant':
            if (!('gcuuid' in chlog.mods)) {
              chlog.mods.gcuuid = this.getChangeLogProp<string>(change, 'gcuuid');
            }
            if (!('gcid' in chlog.mods)) {
              chlog.mods.gcid = this.getChangeLogProp<number>(change, 'gcid');
            }
            break;

          case 'inventar':
            if (!('mcuuid' in chlog.mods)) {
              chlog.mods.mcuuid = this.getChangeLogProp<string>(change, 'mcuuid');
            }
            if (!('ruuid' in chlog.mods)) {
              chlog.mods.ruuid = this.getChangeLogProp<string>(change, 'ruuid');
            }
            break;

          default:
            // Nothing
        }
        const colNames = Object.keys(chlog.mods);

        if (colNames.length === 0 || (colNames.length === 1 && colNames[0].startsWith('modified_'))) {
          return;
        }
        console.log('#211  addChangeLog on changes: An object was updated: ', change.table, change.key, change.mods, { chlog } );
        break;

      case DatabaseChangeType.Delete:
        const deleteChange = change as IDeleteChange;
        return;
        break;
    }

    this.clientChangeLog.add(chlog).catch( (e) => {
      console.error('DexieService addChangeLog #400', { e });
    });
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

  getChangeLogProp<T>(change: IDatabaseChange, propName: string): T|null {
    const ch = change as any;
    if ( (propName in ch) && (propName in ch.obj)) {
      return ch.obj.uuid;
    }
    if ( (propName in ch) && (propName in ch.mods)) {
      return ch.mods.uuid;
    }
    if ( (propName in ch) && (propName in ch.oldObj)) {
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
      return ch.obj.log;
      // return !!ch.obj.log;
    }

    if ( (typeof ch.mods === 'object') && ('log' in ch.mods)) {
      return ch.mods.log;
      // return !!ch.mods.log;
    }

    if ( (typeof ch.oldObj === 'object') && ('log' in ch.oldObj)) {
      return ch.oldObj.log;
      // return !!ch.oldObj.log;
    }
    return undefined;
  }

  stopChangeLogForImport( stop: boolean) {
    console.log('#199 stopClientLogForServerLoad => ', stop);
    this.stopClientLogForServerLoad = stop;
  }
}
