import { EventEmitter, Injectable, Output} from '@angular/core';
import {
  DBDIHersteller,
  DBDIInventar,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant
} from '../../../shared/interfaces/dexie.interfaces';
import { DexieService } from '../../../shared/services/dexie.service';
import { InventarData } from '../../../shared/services/data.service';
import { Guid} from 'guid-typescript';
import { BasedataService} from '../../../shared/services/basedata.service';
import { DatabaseChangeType} from 'dexie-observable/api';
import { AuthService} from '../../auth/auth.service';
import { ArtikelService } from './artikel.service';
import {HerstellerService} from './hersteller.service';

export interface InventarFoundResult {
  success: boolean;
  inventar: null|DBDIInventar;
  artikelRef: null|DBDIObjektKatalogMandant;
  artikelData: null|DBDIObjektKatalogGlobal;
  hersteller: null|DBDIHersteller;
}

export interface InventarBasisDaten {
  ivid?: number;
  uuid?: string;
  code?: string;
  mid?: number;
  mcid?: number;
  mcuuid?: string;
  gcid?: number;
  gcuuid?: string;
  Bezeichnung?: string;
  Gruppe?: string;
  Kategorie?: string;
  Typ?: string;
  Hersteller?: string;
  Groesse?: string;
  Farbe?: string;
  Zustand?: string;
  hid?: number;
  huuid?: string;
  log?: boolean;
}

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
              private authService: AuthService,
              private baseData: BasedataService,
              private herstellerService: HerstellerService,
              private artikelService: ArtikelService
  ) { }

  returnResultSuccess<T extends InventarEditResult>(data: InventarEditResultPresets): T {
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

  getJobiId(): number {
    return this.baseData.getCurrentJobid();
  }

  getMid(): number {
    return this.baseData.getCurrentMid();
  }

  getUserId(): number {
    return this.authService.getUser().id;
  }

  getFreshUuid(): string {
    return Guid.create().toString();
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

  async getInventar(uuid: string): Promise<InventarFoundResult> {
    const result: InventarFoundResult = {
      success: false,
      inventar: null,
      artikelRef: null,
      artikelData: null,
      hersteller: null
    };

    console.log('InventarService #155 getInventar(uuid: ', uuid , ')');
    result.inventar = await this.dexie.inventar.get(uuid);
    console.log('InventarService #157 inventar.get(uuid: ', uuid , ')', { result });

    if (result.inventar) {
      console.log('InventarService #160 objektKatalogMandant.get(uuid: ', result.inventar.mcuuid , ')');
      result.artikelRef = await this.dexie.objektKatalogMandant.get(result.inventar.mcuuid);
      console.log('InventarService #162 objektKatalogMandant.get(uuid: ', result.inventar.mcuuid , ')',
        { resultArtikelRef: result.artikelRef });

      if (result.artikelRef) {
        result.success = true;
        console.log('InventarService #155 objektKatalogGlobal.get(uuid: ', result.artikelRef.gcuuid , ')');
        result.artikelData = await this.dexie.objektKatalogGlobal.get(result.artikelRef.gcuuid);
        console.log('InventarService #155 objektKatalogGlobal.get(uuid: ', result.artikelRef.gcuuid , ')',
          { resultArtikelData: result.artikelData});

        if (result.artikelData.huuid) {
          console.log('InventarService #172 herteller.get(huuid: ', result.artikelData.huuid, ')');
          result.hersteller = await this.dexie.hersteller.get(result.artikelData.huuid);
          console.log('InventarService #174 hersteller.get(huuid: ', result.artikelData.huuid, ')',
            {resultHersteller: result.hersteller});
        }
      }
    }

    return result;
  }

  async insertInventar(inventar: DBDIInventar, useJobid?: number): Promise<InventarInsertResult> {
    const jobid = useJobid || this.getJobiId();
    const uid = this.getUserId();
    const uuid = this.getFreshUuid();
    console.log('InventarService #189 insertInventar: ', { inventar });
    const item: DBDIInventar = {
      mcid: inventar.mcid,
      uuid,
      mcuuid: inventar.mcuuid,
      hash: '',
      code: inventar.code,
      ruuid: inventar.ruuid,
      ruuid_neu: inventar.ruuid,
      for_jobid: inventar.jobid || jobid,
      jobid: inventar.jobid || jobid,
      created_at: inventar.created_at || new Date(),
      created_uid: inventar.created_uid || uid,
      created_jobid: inventar.created_jobid || jobid
    };
    const log = { log: true };

    const insertUuid = await this.dexie.inventar.add( { ...item, ...log});
    console.log('InventarService #207 insertInventar: ', { insertUuid, data: {...item, ...log} });
    const saved = await this.dexie.inventar.get(insertUuid);
    console.log('InventarService #207 insertInventar: ', { insertUuid, saved, data: {...item, ...log} });
    if (insertUuid && saved) {
      this.dexie.barcodeLookup.add({
        code: saved.code,
        for_jobid: jobid,
        table: 'inventar',
        key: 'uuid',
        uuid: insertUuid,
        updateHelper: 11
      });
      const lkupItem = await this.dexie.barcodeLookup.get({code: saved.code, for_jobid: jobid});
      console.log('InventarService #220 insertInventar: ', { insertUuid, saved, lkupItem, data: {...item, ...log} });
    }
    this.changed.emit({
      type: InventarChangeType.Create,
      table: this.dexie.inventar.name,
      key: insertUuid,
      uuid,
      obj: item
    });

    return this.returnResultSuccess<InventarInsertResult>({
      type: InventarChangeType.Create,
      insertUUID: uuid
    });
  }

  async updateArtikelRef(uuid: string, inventar: DBDIInventar, useJobid?: number): Promise<InventarEditResult> {
    const jobid = useJobid || this.getJobiId();
    const uid = this.getUserId();

    /*
    const inventar: DBDIInventar = {
      mcid: this.formInventar.mcid,
      mcuuid: this.formInventar.mcuuid,
      ruuid: this.formInventar.ruuid,
      code: this.formInventar.Barcode,
      jobid,
      created_at: new Date(),
      created_uid: uid
    };
    */
    const inventarEditResult: InventarEditResult = {
      type: InventarChangeType.Update,
      success: false,
      message: '',
      errorMsg: '',
      errorCode: InventarEditErrorCode.NoError,
      insertUUID: uuid
    };

    const item: DBDIInventar = {
      mcid: inventar.mcid,
      uuid,
      mcuuid: inventar.mcuuid,
      code: inventar.code,
      jobid: inventar.jobid || jobid,
      modified_at: inventar.modified_at || new Date(),
      modified_uid: inventar.modified_uid || uid,
      modified_jobid: inventar.modified_jobid || jobid
    };
    return this.dexie.inventar.update(uuid, item).then(
      (n: number) => {
        inventarEditResult.success = true;
        inventarEditResult.message = 'Inventar wurde aktualisiert!';
        return inventarEditResult;
    },
      (reason: any) => {
        console.error('InventarService updateArtikelRef #277', {
          uuid,
          inventar,
          updateData: item,
          reason
        });
        inventarEditResult.errorCode = InventarEditErrorCode.InventarNotFound;
        inventarEditResult.message = 'Fehler bei Aktualisierung der Inventardaten! (siehe console.error)';
        inventarEditResult.errorMsg = JSON.stringify(reason);
        return inventarEditResult;
      });
  }

  async updateByUuid(uuid: string, daten: InventarBasisDaten): Promise<InventarFoundResult> {
    // return this.getInventar(ivid);
    console.log('#205 updateById', { uuid, daten });

    const updateData = daten;
    const jobid = this.getJobiId();
    const uid = this.getUserId();
    const mid = this.getMid();
    const devID = this.baseData.getCurrentDeviceId();
    const oldData = await this.getInventar(uuid);
    let bUpdateBarceLookup = false;

    const globalKatalogDaten = {
      Bezeichnung: daten.Bezeichnung,
      Gruppe: daten.Gruppe,
      Kategorie: daten.Kategorie,
      Typ: daten.Typ,
      Farbe: daten.Farbe,
      Groesse: daten.Groesse,
      hid: daten.hid || 0,
      huuid: daten.huuid || null
    };

    if (daten.Hersteller) {
      console.log('#226 checkAndGet Hersteller: ', daten.Hersteller);
      const hstQuery = this.dexie.hersteller.where('Hersteller').equals(daten.Hersteller);
      if (await hstQuery.count() > 0) {
        console.log('#228 checkAndGet Hersteller existiert bereits');
        await this.dexie.hersteller
          .where('Hersteller').equals(daten.Hersteller)
          .first()
          .then( hstData => {
            globalKatalogDaten.hid = hstData.hid;
            globalKatalogDaten.huuid = hstData.uuid;
          });
      } else {
        console.log('#238 checkAndGet Hersteller wird angelegt');
        await this.herstellerService.createAndGetData(daten.Hersteller)
          .then( (hst) => {
          globalKatalogDaten.hid = hst.hid;
          globalKatalogDaten.huuid = hst.uuid;
        });
      }
    }

    const okgFilledFields = this.getFilledFields(globalKatalogDaten);
    const okgEmptyFieldnames = Object.keys(this.getEmptyFields(globalKatalogDaten));
    const okgArtikelMatches = await this.dexie.objektKatalogGlobal
      .filter( (rslt) => {
        for (const ff of Object.keys(okgFilledFields)) {
          const val = okgFilledFields[ff];
          const valRslt = typeof rslt[ff] === 'string' ? rslt[ff].trim() : rslt[ff];
          if (val !== valRslt) {
            return false;
          }
        }
        for (const ef of okgEmptyFieldnames) {
          const valRslt = typeof rslt[ef] === 'string' ? rslt[ef].trim() : rslt[ef];
          if (null !== valRslt && '' !== valRslt) {
            return false;
          }
        }
        return true;
      }).toArray();

    console.log('#267 okgArtikelMatches', { okgFilledFields, okgEmptyFieldnames, okgArtikelMatches });
    let okgArtikel: DBDIObjektKatalogGlobal = null;
    let okmArtikelRef: DBDIObjektKatalogMandant = null;

    switch (okgArtikelMatches.length) {
      case 0:
        console.log('#273 checkAndGet Artikel wird angelegt');
        okgArtikel = await this.artikelService.insertArtikelData(globalKatalogDaten);
        break;

      case 1:
        okgArtikel = okgArtikelMatches[0];
        break;

      default:
        okgArtikel = okgArtikelMatches.sort( (a, b) => {
          const rankA = a.created_jobid === jobid ? 1 : (a.modified_jobid === jobid ? 2 : 3);
          const rankB = b.created_jobid === jobid ? 1 : (b.modified_jobid === jobid ? 2 : 3);
          return rankA < rankB ? -1 : (rankA > rankB ? 1 : 0);
        })[0];
    }

    if (okgArtikel) {
      console.log('#290 checkAndGet Artikel existiert/angelegt');
      okmArtikelRef = await this.dexie.objektKatalogMandant.where({
        mid,
        for_jobid: jobid,
        gcid: okgArtikel.gcid
      }).first();

      if (!okmArtikelRef) {
        console.log('#296 checkAndGet ArtikelRef nuss angeleget werden');
        okmArtikelRef = await this.artikelService.insertArtikelRefByGcidGcuuid(okgArtikel.uuid);
      }

      const updateInv: any = {};
      if (okmArtikelRef.uuid !== daten.mcuuid) {
        updateInv.mcuuid = okmArtikelRef.uuid;
      }
      if (oldData.inventar.Zustand !== daten.Zustand) {
        updateInv.Zustand = daten.Zustand;
      }
      if (oldData.inventar.code !== daten.code) {
        updateInv.code = daten.code;
        bUpdateBarceLookup = true;
      }

      if (Object.keys(updateInv).length > 0) {
        console.log('#310 checkAndGet ArtikelRef-ID muss im Inventar aktualisiert werden');
        updateInv.modified_at = new Date();
        updateInv.modified_uid = uid;
        updateInv.modified_jobid = jobid;
        updateInv.modified_device_id = devID;
        updateInv.log = true;

        await this.dexie.inventar.update(uuid, updateInv).then( () => {
          if (bUpdateBarceLookup) {
            console.log('InventarService #353 call updateBarcodelookup(', { ivid: uuid, datenCode: daten.code });
            this.updateBarcodeLookup(uuid, daten.code, oldData.inventar.code);
          } else {
            console.log('InventarService #356 Barcode has not changed');
          }
        });
      }
    }

    const result = await this.getInventar(uuid);
    console.log('#322 return Inventar-Data', result);

    return result;
  }

  async updateRefs(uuid: string, mcuuid: string, daten?: any) {
    const jobid = this.getJobiId();
    const uid = this.getUserId();
    const mid = this.getMid();
    const devID = this.baseData.getCurrentDeviceId();
    const updateInv: any = {};
    const oldData = await this.getInventar(uuid);
    let bUpdateBarceLookup = false;

    updateInv.mcuuid = mcuuid;

    if (daten.Zustand && daten.Zustand !== oldData.inventar.Zustand) {
      updateInv.Zustand = daten.Zustand;
    }

    if (daten.code && daten.code !== oldData.inventar.code) {
      updateInv.code = daten.code;
      bUpdateBarceLookup = true;
    }

    console.log('#310 checkAndGet ArtikelRef-ID muss im Inventar aktualisiert werden');
    updateInv.modified_at = new Date();
    updateInv.modified_uid = uid;
    updateInv.modified_jobid = jobid;
    updateInv.modified_device_id = devID;
    updateInv.log = true;

    this.dexie.inventar.update(uuid, updateInv).then( () => {
      if (bUpdateBarceLookup) {
        this.updateBarcodeLookup(uuid, daten.code, oldData.inventar.code);
      }
    });
  }

  async updateBarcodeLookup(uuid: string, code: string, oldCode?: string) {
    console.log('InventarService #410 called updateBarcodelookup(', { uuid, code }, ')');
    let savedRaumDataCode = oldCode;
    const savedRaumData = await this.dexie.inventar.get(uuid);
    if (!oldCode) {
      savedRaumDataCode = savedRaumData.code;
    }
    const jobid = this.getJobiId();
    console.log('InventarService #413 check if code has changed(', { ivid: uuid, code, savedRaumDataCode }, ')');
    if (savedRaumDataCode !== code) {
      const lkupKey = {
        code: savedRaumDataCode,
        for_jobid: jobid
      };
      const bcItem = await this.dexie.barcodeLookup.get(lkupKey);
      if (bcItem) {
        console.log('InventarService #420 make update on existing bcItem: ', { lkupKey });
        await this.dexie.barcodeLookup.update([savedRaumDataCode, jobid], {
          code
        });
      } else {
        console.log('InventarService #425 create new bcItem');
        this.dexie.barcodeLookup.put({
          code,
          for_jobid: jobid,
          key: 'uuid',
          table: 'inventar',
          updateHelper: 1,
          uuid: savedRaumData.uuid
        });
      }
    }
  }

  getFilledFields(obj: object): object {
    const allFields = Object.keys(obj);
    const filledFields = {};
    for (const f of allFields) {
      const val = (typeof obj[f] === 'string') ? obj[f].trim() : obj[f];
      if (null === val || '' === val) {
        continue;
      }
      filledFields[f] = val;
    }
    return filledFields;
  }

  getEmptyFields(obj: object): object {
    const allFields = Object.keys(obj);
    const emptyFields = {};
    for (const f of allFields) {
      const val = (typeof obj[f] === 'string') ? obj[f].trim() : obj[f];
      if (null === val || '' === val) {
        emptyFields[f] = val;
      }
    }
    return emptyFields;
  }

  async assignRaum(uuid: string, ruuid: string, useJobid?: number): Promise<InventarEditResult> {
    const db = this.dexie;
    const inventar = db.inventar;
    const raeume = db.raeume;
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const devid = this.baseData.getCurrentDeviceId();
    const log = { log: true };

    console.log('InventoryEditorService.assignInventarToRaum', {
      uuid,
      ruuid,
      jobid,
      uid,
      devid
    });

    return Promise.all([
      inventar.get(uuid),
      raeume.get(ruuid)
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
          ruuid: raum.uuid,
          jobid,
          modified_at: new Date(),
          modified_uid: uid,
          modified_jobid: jobid,
          modified_device_id: devid
        };

        return inventar.update(inv.uuid, { ...changes, ...log}).then( () => {
          this.changed.emit({
            type: InventarChangeType.Update,
            table: inventar.name,
            key: inv.uuid,
            uuid: inv.uuid,
            obj: { ...inv, ...changes },
            mods: changes
          });

          return this.returnResultSuccess<InventarEditResult>({
            type: InventarChangeType.Update
          });
        } );
      });
  }

  async getInventarListRestByRaumUuid(ruuid: string, jobid: number): Promise<InventarData[]> {

    const inventarDataList: InventarData[] = [];
    const inventarList = await this.dexie.inventar
      .where({ ruuid })
      .and( (item) => item.jobid !== jobid)
      .sortBy( 'created_at' );

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where( 'uuid').anyOf( inventarList.map<string>( itm => itm.mcuuid ) )
      .toArray();

    const artikelData = await this.dexie.objektKatalogGlobal
      .where( 'uuid').anyOf( artikelRefs.map<string>( itm => itm.gcuuid) )
      .toArray();

    for (const inventar of inventarList) {
      const d: InventarData = { inventar, artikelRef: null, artikelData: null };
      d.artikelRef = artikelRefs.find( itm => itm.uuid === inventar.mcuuid);
      if (d.artikelRef) {
        d.artikelData = artikelData.find( itm => itm.uuid === d.artikelRef.gcuuid );
      }
      inventarDataList.push(d);
    }
    return inventarDataList;
  }

  async getInventarListDoneByRaumUuid(ruuid: string, jobid: number): Promise<InventarData[]> {

    const inventarDataList: InventarData[] = [];
    const inventarList = await this.dexie.inventar
      .where({ ruuid })
      .and( (item) => item.jobid === jobid)
      .sortBy( 'modified_at' );

    const artikelRefs = await this.dexie.objektKatalogMandant
      .where( 'uuid').anyOf( inventarList.map<string>( itm => itm.mcuuid ) )
      .toArray();

    const artikelData = await this.dexie.objektKatalogGlobal
      .where( 'uuid').anyOf( artikelRefs.map<string>( itm => itm.gcuuid) )
      .toArray();

    for (const inventar of inventarList) {
      const d: InventarData = { inventar, artikelRef: null, artikelData: null };
      d.artikelRef = artikelRefs.find( itm => itm.uuid === inventar.mcuuid);
      if (d.artikelRef) {
        d.artikelData = artikelData.find( itm => itm.uuid === d.artikelRef.gcuuid );
      }
      inventarDataList.push(d);
    }
    return inventarDataList;
  }
}
