import { Injectable } from '@angular/core';
import { DBDIArtikel} from './dexie.interfaces';
import { DexieService } from './dexie.service';
import { BasedataService} from './basedata.service';
import { DatabaseChangeType} from 'dexie-observable/api';

export interface InventoryEditorResultPresets {
  success?: boolean;
  message?: string;
  errorMsg?: string;
  errorCode?: InventoryEditorErrorCode;
}

export interface InventoryEditorResult {
  success: boolean;
  message?: string;
  errorMsg?: string;
  errorCode?: InventoryEditorErrorCode;
}

export interface InventoryEditorInsertResult extends InventoryEditorResult {
  insertID?: number;
}



export enum InventoryEditorErrorCode {
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
export class InventoryEditorService {

  constructor(private dexieService: DexieService, private baseData: BasedataService) { }

  returnResultSuccess(data?: InventoryEditorResultPresets) {
    data = data || {};
    return {
      success: true,
      message: data.message || '',
      errorMsg: data.errorMsg || '',
      errorCode: data.errorCode || null,
    };
  }

  returnResultError(data?: InventoryEditorResultPresets) {
    data = data || {};
    return {
      success: false,
      message: data.message || '',
      errorMsg: data.errorMsg || '',
      errorCode: data.errorCode || null,
    };
  }

  async updateInventar(invid: number, data: DBDIArtikel) {}

  async updateArtikelImage(invid: number, data: Blob) {}

  async assignInventarToRaum(ivid: number, rid: number, useJobid?: number): Promise<InventoryEditorResult> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const devid = this.baseData.getCurrentDeviceId();
    console.log('InventoryEditorService.assignInventarToRaum', {
      ivid,
      rid,
      jobid,
      uid,
      devid
    });

    return Promise.all([
        this.dexieService.inventar.get(ivid),
        this.dexieService.raeume.get(rid)
      ])
      .then(result => {
        const inv = result[0];
        const raum = result[1];
        console.log('InventoryEditorService.assignInventarToRaum', {
          inv,
          raum
        });

        if (!inv) {
          return this.returnResultError( { errorCode: InventoryEditorErrorCode.InventarNotFound });
        }

        if (!raum) {
          return this.returnResultError( { errorCode: InventoryEditorErrorCode.RaumNotFound });
        }

        return this.dexieService.inventar.update(inv.ivid, {
          rid,
          ruuid: raum.uuid,
          jobid,
          modified_uid: uid,
          modified_jobid: jobid,
          modified_device_id: devid
        }).then( () => this.returnResultSuccess() );
      });
  }

  async undoAssignedInventarToRaum(ivid: number, rid: number, useJobid?: number): Promise<InventoryEditorResult> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    return this.dexieService.clientChangeLog
      .where({ table: 'raeume', key: ivid, jobid })
      .filter( item => item.obj && ('rid' in item.obj) && item.obj.rid === rid )
      .last()
      .then( item => {

        if (item.type === DatabaseChangeType.Create) {
          return this.dexieService.inventar
            .delete( item.key )
            .then( () => this.dexieService.clientChangeLog.delete( item.id) )
            .then( () => this.returnResultSuccess());

        } else if (item.type === DatabaseChangeType.Update) {
          return this.dexieService.inventar
            .update(ivid, item.oldObj)
            .then( (num: number) => {
              if (num > 0) {
                return this.dexieService.clientChangeLog.delete( item.id);
              } else {
                throw new Error('Cannot undo Raum-Inventar-Zuweisung!');
              }
            })
            .then( () => this.returnResultSuccess())
            .catch( (err) => this.returnResultError( { errorMsg: err }));
        } else {
          return this.returnResultError();
        }
      });
  }

  async createKatalogArtikel(data: DBDIArtikel) {}

  async undoCreatedKatalogArtikel(invid: number) {}

  async assignArtikelToRaum(invid: number, rid: number) {}
}
