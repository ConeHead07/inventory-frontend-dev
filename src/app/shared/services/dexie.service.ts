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

  aPreventDeleteLogs: { table: string, uuid: string, time: number }[] = [];

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
        console.log('Datenbank wurde geleert!');
        return true;
      }).catch( (r) => {
        console.log('clear db finished');
        console.error(r);
        return false;
      });
  }

  async deleteDB(): Promise<boolean> {
    const dbName = this.name;
    console.log('delete db ' + dbName);
    return Dexie.delete(dbName).then( () => {
      alert('Browser-Datenbank ' + dbName + ' wurde gelöscht!\n' +
        'Die Seite wird für den Neu-Aufbau neu geladen\n' +
        ' und muss nötigenfalls auch händisch wiederholt neu geladen werden!');
      document.location.href = '/';
      return true;
    }).catch( (reason) => {
      alert('Beim Löschen sind Fehler aufgetreten\n' +
        'Die Seite wird neu geladen\n' +
        ' und muss nötigenfalls auch händisch wiederholt neu geladen werden!');
      document.location.href = '/';
      return false;
    });
  }

  init() {
    Dexie.Syncable.registerSyncProtocol('inventorySync', this.syncClient );
    this.nextDbVersion = this.dbVersion + 1;

    this.version(12).stores({
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
      '$$uuid,id,for_jobid,RefTable,RefUuid,ImgUuid,Kategorie',
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

    if (true) {
      const v10 = this.nextDbVersion;
      this.version(v10).stores({
        barcodeLookup:
          '&[code+for_jobid],table,for_jobid,[table+for_jobid],[table+for_jobid+updateHelper],updateHelper,[table+updateHelper]',
      });
      this.nextDbVersion += 1;
    }
    if (true) {
      const v11 = this.nextDbVersion;
      this.version(v11).stores({
        objektKatalogImages:
          '$$uuid,id,for_jobid,RefTable,RefUuid,ImgUuid,Kategorie,[RefTable+RefUuid+Kategorie]',
      });
      this.nextDbVersion += 1;
    }
    if (true) {
      const v12 = this.nextDbVersion;
      this.version(v12).stores({
        objektKatalogImages:
          '$$uuid,id,for_jobid,RefTable,RefUuid,ImgUuid,Kategorie,[RefTable+RefUuid+Kategorie],[RefTable+RefUuid]',
      });
      this.nextDbVersion += 1;
    }


    const validLogTables = [
      'hersteller',
      'inventar',
      'inventurenUserStatus',
      'images',
      'objektKatalogGlobal',
      'objektKatalogMandant',
      'objektKatalogImages',
      'raeume'
    ];
    validLogTables.forEach( (name) => {
      console.log('DexieService #292 validLogTable '
        + name +
        ' primKey.keyPath: ' +
        this.table( name ).schema.primKey.keyPath,
        this.table( name ).schema.primKey.keyPath === 'uuid',
        typeof this.table( name ).schema.primKey.keyPath);
    });

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
      console.log('#315 dexie.service on changes: changes.length: ', changes.length, 'partial: ', partial, { changes});
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

  preventDeleteSyncLog(table: string, uuid: string) {
    this.aPreventDeleteLogs.push({ table, uuid, time: Date.now() });
  }

  async addChangeLog(change: IDatabaseChange) {
    const logFlag = this.getChangeLogFlag(change);
    const changeType = change.type;
    const changeTable = change.table;
    const changeKey = change.key;
    const logPrefix = 'DexieService.addChangeLog(change[' + change.table + ',' + change.type + ',' + change.key + '] ';
    const isInDebugMode = false;

    if (changeType < 3 && 'obj' in change && 'log' in (change as any).obj) {
      // If Log-Flag is set, reset log-Setting for next Operation of this record
      const objWithoutLog = (change as any).obj;
      delete objWithoutLog.log;
      await this.table( changeTable ).put(objWithoutLog, changeKey).catch( (err) => {
        console.error(err, logPrefix + '#368 ', { objWithoutLog });
      });
      if (logFlag === false) {
        console.log(logPrefix + '#324 ABORT log:', logFlag, {change});
        return;
      }
    }
    if (change.type === 3) {
      if (this.aPreventDeleteLogs.length > 0) {
        const preventLogs = this.aPreventDeleteLogs.find( (item) => {
          return item.table === changeTable && item.uuid === changeKey;
        });
        this.aPreventDeleteLogs = this.aPreventDeleteLogs.filter((item) => {
          return item.time > Date.now() - (1000 * 60 * 2);
        });
        if (preventLogs) {
          this.aPreventDeleteLogs = this.aPreventDeleteLogs.filter((item) => {
            return item.table !== changeTable && item.uuid !== changeKey;
          });
          return;
        }
      }
      if (changeTable === 'inventurenUserStatus') {
        // Do not log
        return;
      }
    }
    if (change.type === 2) {
      const updateChange = change as IUpdateChange;
      const changeCols: string[] = Object.keys( updateChange.mods );
      if ( 1 === changeCols.length && 'log' in changeCols) {
        return;
      }
    }
    const uuid = (this.table( changeTable ).schema.primKey.keyPath === 'uuid') ? change.key : '';

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
        break;

      case DatabaseChangeType.Update:
        const updateChange = change as IUpdateChange;
        chlog.mods = updateChange.mods;
        if ('log' in chlog.mods) {
          delete chlog.mods.log;
        }
        if (!Object.keys(change.mods).length) {
          return;
        }
        const contentCols = Object.keys(change.mods).filter( (col, idx) => {
          const noContentCols = [ 'log', 'modified_at', 'modified_uid', 'modified_device_id', 'modified_jobid' ];
          const isContent = noContentCols.indexOf(col) === -1 &&
            change.mods[col] !== undefined &&
            change.mods[col] !== null
            ;
          if (isInDebugMode) {
            const indexOfNoContent = noContentCols.indexOf(col);
            console.log('DexieService.addChangeLog() #421 contentCols filter ',
              { col, idx, indexOfNoContent, isContent });
          }
          return isContent;
        });

        if (isInDebugMode && contentCols.length === 0) {
          console.log('DexieService.addChangeLog() #430 no contentCols after Filtering, No-Change-Log!', {
            changeMods: {...change.mods}
          });
          return;
        }

        const colNames = Object.keys(chlog.mods);

        if (colNames.length === 0 || (colNames.length === 1 && colNames[0].startsWith('modified_'))) {
          return;
        }
        if (isInDebugMode) {
          console.log('#211  addChangeLog on changes: An object was updated: ',
            change.table, change.key, change.mods, { chlog } );
        }
        break;

      case DatabaseChangeType.Delete:
        const deleteChange = change as IDeleteChange;
        break;
    }

    this.clientChangeLog.add(chlog)
      .catch( reason => {
        console.error(reason, logPrefix + ' #443 clientChangeLog.add', { chlog });
    });
  }

  getChangeLogFlag(change: IDatabaseChange): boolean|undefined {
    const ch = change as any;
    const changeType = change.type;

    if ( typeof ch !== 'object') {
      console.error('DexieService.getChangeLogFlag(change) #192 change is not a object: ', change);
      return false;
    }

    if (changeType === 1) {
      const createChange = change as ICreateChange;
      return ('log' in createChange.obj) ? createChange.obj.log : undefined;
    }

    if (changeType === 2) {
      const updateChange = change as IUpdateChange;
      if ('log' in updateChange.mods) {
        return updateChange.mods.log;
      }
      if ('log' in ch.obj) {
        return ch.obj.log;
      }
      return undefined;
    }

    if (changeType === 3) {
      if ('oldObj' in ch && 'log' in ch.oldObj) {
        return ch.oldObj.log;
      }
    }

    return undefined;
  }

  stopChangeLogForImport( stop: boolean) {
    console.log('#199 stopClientLogForServerLoad => ', stop);
    this.stopClientLogForServerLoad = stop;
  }
}
