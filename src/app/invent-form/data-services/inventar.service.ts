import { EventEmitter, Injectable, Output} from '@angular/core';
import { DBDIInventar} from '../../dexie.interfaces';
import { DexieService } from '../../dexie.service';
import { InventarData } from '../../inventory/service/data.service';
import { Guid} from 'guid-typescript';
import { BasedataService} from '../../basedata.service';
import { DatabaseChangeType} from 'dexie-observable/api';

export const enum InventarChangeType {
  Create = DatabaseChangeType.Create,
  Update = DatabaseChangeType.Update,
  Delete = DatabaseChangeType.Delete
}

export interface InventarChanged {
  type: InventarChangeType;
  table: string;
  key: any;
  uuid?: string;
  obj?: any;
  mods?: {[keyPath: string]: any | undefined};
}

export interface InventarEditResultPresets {
  type: InventarChangeType;
  success?: boolean;
  message?: string;
  errorMsg?: string;
  errorCode?: InventarEditErrorCode;
  insertID?: number;
  insertUUID?: string;
}

export interface InventarEditResult extends InventarEditResultPresets {
  success: boolean;
}

export interface InventarInsertResult extends InventarEditResult {
  insertID: number;
  insertUUID: string;
}

export enum InventarEditErrorCode {
  NoError,
  RaumNotFound,
  InventarNotFound,
  ArtikelNotFound,
  ArtikelMandantNotFound,
  ArtikelGlobalNotFound
}

@Injectable({
  providedIn: 'root'
})
export class InventarService {

  @Output() changed = new EventEmitter<InventarChanged>();

  constructor(private dexie: DexieService,
              private baseData: BasedataService) { }

  returnResultSuccess(data: InventarEditResultPresets): InventarEditResult {
    const result: any = {
      type: data.type,
      success: true,
      message: data.message || ''
    };
    if (data.type === InventarChangeType.Create) {
      result.insertID = data.insertID;
      result.insertUUID = data.insertUUID;
    }
    return result;
  }

  returnResultError(data: InventarEditResultPresets): InventarEditResult {
    return {
      type: data.type,
      success: false,
      message: data.message || '',
      errorMsg: data.errorMsg || '',
      errorCode: data.errorCode || null,
    };
  }

  getHello(): string {
    return 'hello';
  }

  async insertInventar(inventar: DBDIInventar, useJobid?: number): Promise<InventarEditResult> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const uuid = Guid.create().toString();
    const item: DBDIInventar = {
      mcid: inventar.mcid,
      uuid,
      mcuuid: inventar.mcuuid,
      hash: '',
      code: inventar.code,
      rid: inventar.rid,
      rid_neu: inventar.rid,
      jobid: inventar.jobid || jobid,
      created_at: inventar.created_at || new Date(),
      created_uid: inventar.created_uid || uid,
      created_jobid: inventar.created_jobid || jobid
    };
    const log = { log: true };

    const id = await this.dexie.inventar.add( { ...item, ...log});
    item.ivid = id;
    this.changed.emit({
      type: InventarChangeType.Create,
      table: this.dexie.inventar.name,
      key: id,
      uuid,
      obj: item
    });

    return this.returnResultSuccess({
      type: InventarChangeType.Create,
      insertID: id,
      insertUUID: uuid
    });
  }

  async assignRaum(ivid: number, rid: number, useJobid?: number): Promise<InventarEditResult> {
    const db = this.dexie;
    const inventar = db.inventar;
    const raeume = db.raeume;
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const devid = this.baseData.getCurrentDeviceId();
    const log = { log: true };

    console.log('InventoryEditorService.assignInventarToRaum', {
      ivid,
      rid,
      jobid,
      uid,
      devid
    });

    return Promise.all([
      inventar.get(ivid),
      raeume.get(rid)
    ])
      .then(result => {
        const inv = result[0];
        const raum = result[1];
        console.log('InventoryEditorService.assignInventarToRaum', {
          inv,
          raum
        });

        if (!inv) {
          return this.returnResultError( {
            type: InventarChangeType.Update,
            errorCode: InventarEditErrorCode.InventarNotFound });
        }

        if (!raum) {
          return this.returnResultError( {
            type: InventarChangeType.Update,
            errorCode: InventarEditErrorCode.RaumNotFound });
        }
        const changes = {
          rid,
          ruuid: raum.uuid,
          jobid,
          modified_at: new Date(),
          modified_uid: uid,
          modified_jobid: jobid,
          modified_device_id: devid
        };

        return inventar.update(inv.ivid, { ...changes, ...log}).then( () => {
          this.changed.emit({
            type: InventarChangeType.Update,
            table: inventar.name,
            key: inv.ivid,
            uuid: inv.uuid,
            obj: { ...inv, ...changes },
            mods: changes
          });
          return this.returnResultSuccess({
            type: InventarChangeType.Update
          });
        } );
      });
  }

  async getInventarListRestByRaumId(rid: number, jobid: number): Promise<InventarData[]> {

    const inventarDataList: InventarData[] = [];
    const inventarList = await this.dexie.inventar
      .where({ rid })
      .and( (item) => item.jobid !== jobid)
      .sortBy( 'mcid' );

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where( 'mcid').anyOf( inventarList.map<number>( itm => itm.mcid ) )
      .toArray();

    const artikelData = await this.dexie.objektKatalogGlobal
      .where( 'gcid').anyOf( artikelRefs.map<number>( itm => itm.gcid) )
      .toArray();

    for (const inventar of inventarList) {
      const d: InventarData = { inventar, artikelRef: null, artikelData: null };
      d.artikelRef = artikelRefs.find( itm => itm.mcid === inventar.mcid);
      if (d.artikelRef) {
        d.artikelData = artikelData.find( itm => itm.gcid === d.artikelRef.gcid );
      }
      inventarDataList.push(d);
    }
    return inventarDataList;
  }

  async getInventarListDoneByRaumId(rid: number, jobid: number): Promise<InventarData[]> {

    const inventarDataList: InventarData[] = [];
    const inventarList = await this.dexie.inventar
      .where({ rid })
      .and( (item) => item.jobid === jobid)
      .sortBy( 'mcid' );

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where( 'mcid').anyOf( inventarList.map<number>( itm => itm.mcid ) )
      .toArray();

    const artikelData = await this.dexie.objektKatalogGlobal
      .where( 'gcid').anyOf( artikelRefs.map<number>( itm => itm.gcid) )
      .toArray();

    for (const inventar of inventarList) {
      const d: InventarData = { inventar, artikelRef: null, artikelData: null };
      d.artikelRef = artikelRefs.find( itm => itm.mcid === inventar.mcid);
      if (d.artikelRef) {
        d.artikelData = artikelData.find( itm => itm.gcid === d.artikelRef.gcid );
      }
      inventarDataList.push(d);
    }
    return inventarDataList;
  }
}
