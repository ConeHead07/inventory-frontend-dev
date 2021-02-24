import { Injectable } from '@angular/core';
import {DbInsertResult, DbUpdateResult} from './data-interfaces';
import {
  DBDIArtikel, DBDIHersteller, DBDIInventar,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant
} from '../../../shared/interfaces/dexie.interfaces';
import { DexieService } from '../../../shared/services/dexie.service';
import {AuthService} from '../../auth/auth.service';
import {Guid} from 'guid-typescript';
import Dexie from 'dexie';
import {throwError} from 'rxjs';
import {
  DataService,
  JoinFlexFormatted,
  JoinResultType,
  JoinStrictFormatted,
  TableIdxProps
} from '../../../shared/services/data.service';
import {BasedataService} from '../../../shared/services/basedata.service';
import {HerstellerService} from './hersteller.service';


export interface ArtikelBasisDaten {
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
  hid?: number;
  huuid?: string;
  log?: boolean;
}

export interface ArtikelRefInsertData {
  gcid: number;
  gcuuid: string;
  mid?: number;
  for_jobid?: number;
}

export interface DBInsertArtikelResult extends DbInsertResult {
  newItem?: DBDIArtikel;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface DBUpdateArtikelResult extends DbUpdateResult {
  item?: DBDIArtikel;
}

export interface ArtikelPropertiesForQueryCount {
  hid?: number;
  huuid?: string;
  Bezeichnung?: string;
  Typ?: string;
  Kategorie?: string;
  Gruppe?: string;
  Farbe?: string;
  Groesse?: string;
}

export interface ArtikelHerstellerImg {
  gcid: number;
  gcuuid: string;
  mcid?: number;
  mcuuid?: string;
  hid?: number;
  huuid?: string;
  Bezeichnung?: string;
  Typ?: string;
  Kategorie?: string;
  Gruppe?: string;
  Farbe?: string;
  Groesse?: string;
  Hersteller?: string;
  hersteller?: DBDIHersteller;
  artikelRef?: DBDIObjektKatalogMandant;
  inventar_count?: number;
  img_id?: number;
  img_uuid?: string;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ArtikelService {

  constructor(private dexie: DexieService,
              private authService: AuthService,
              private dataService: DataService,
              private baseData: BasedataService,
              private herstellerService: HerstellerService) {}

  public async artikelBezeichnungExistsGlobal(bezeichnung: string): Promise<number> {
    return await this.dexie.objektKatalogGlobal
      .where('Bezeichnung')
      .equalsIgnoreCase( bezeichnung )
      .count();
  }

  public async ___DEL__artikelExistsMandant(mid: number, gcid: number): Promise<boolean> {
    const numItems = await this.dexie.objektKatalogMandant
      .where({ mid, gcid })
      .count();

    return 0 < numItems;
  }

  public async artikelGlobalByBezeichnung(bezeichnung: string): Promise<DBDIObjektKatalogGlobal[]> {
    const items = await this.dexie.objektKatalogGlobal
      .where('Bezeichnung')
      .equalsIgnoreCase( bezeichnung )
      .toArray();

    return items;
  }

  public async artikelMcuuidByGcuuids(mid: number, gcuuids: string|string[]): Promise<DBDIObjektKatalogMandant[]> {
    if (typeof gcuuids === 'string') {
      gcuuids = [ gcuuids ];
    }

    const items = await this.dexie.objektKatalogMandant
      .where( 'gcuuid').anyOf(gcuuids)
      .filter( itm => itm.mid === mid)
      .toArray();

    return items;
  }

  public async ___DEL__getGcuuidByGcuuid(uuid: string): Promise<string> {
    return this.dexie.objektKatalogGlobal.get( uuid ).then( (itm) => itm.uuid );
  }

  public async insertArtikelData(daten: ArtikelBasisDaten): Promise<DBDIObjektKatalogGlobal> {
    const db = this.dexie;
    const katalog = db.objektKatalogGlobal;
    const hersteller = db.hersteller;
    const uid = this.authService.getUser().id;
    const jobid = this.baseData.getCurrentJobid();
    const deviceid = this.baseData.getCurrentDeviceId();
    const uuid = Guid.create().toString();
    const log = { log: true };

    if (daten.Hersteller) {
      console.log('ArtikelService insertArtikelDate() #153');
      await this.herstellerService.getByNameOrCreate(daten.Hersteller).then( hstData => {
        daten.hid = hstData.hid;
        daten.huuid = hstData.uuid;
      });
    }

    const exists = await katalog.where({
      Bezeichnung: daten.Bezeichnung,
      huuid: daten.huuid
    }).toArray();

    if (exists) {
      const sameData = exists.filter( (itm) => {
        for (const k of [ 'huuid', 'Gruppe', 'Kategorie', 'Typ', 'Farbe', 'Groesse']) {
          if (itm[k] !== daten[k]) {
            return false;
          }
        }
        return true;
      });
      if (sameData.length > 0) {
        console.log('ArtikelService insertArtikelData() #175');
        return sameData[0];
      } else {
        throwError({
          name: 'DuplicateEntry',
          message: 'Es existiert bereits ein Katalogeintrag mit gleicher Bezeichnung,' +
            ' der aufgrund abweichender Details nicht übernommen werden kann.\n' +
            ' Da Bezeichnungen unique sein müssen, ändern sie diese bitte ab oder übernehmen den anderen Eintrag!',
          data: sameData
        });
      }
    }

    const insertData: DBDIObjektKatalogGlobal = {
      uuid,
      hash: null,
      code: uuid,
      hid: daten.hid,
      huuid: daten.huuid,
      Bezeichnung: daten.Bezeichnung,
      Typ: daten.Typ,
      Gruppe: daten.Gruppe,
      Kategorie: daten.Kategorie,
      Farbe: daten.Farbe,
      Groesse: daten.Groesse,
      created_at: new Date(),
      modified_at: null,
      created_uid: uid,
      created_device_id: deviceid,
      created_jobid: jobid,
      lid: !('lid' in daten as any) ? null :  (daten as any).lid,
      Produktnr: !('Produktnr' in daten) ? null : (daten as any).Produktnr,
      Bild: !('Bild' in daten) ? null : (daten as any).Bild,
      AnlagenNr: !('AnlagenNr' in daten) ? null : (daten as any).AnlagenNr,
      GeraetNr: !('GeraetNr' in daten) ? null : (daten as any).GeraetNr,
      FibuNr: !('FibuNr' in daten) ? null : (daten as any).FibuNr,
      Flaeche: !('Flaeche' in daten) ? null : (daten as any).Flaeche,
      Gewicht: !('Gewicht' in daten) ? null : (daten as any).Gewicht,
      Baujahr: !('Baujahr' in daten) ? null : (daten as any).Baujahr,
      Kst: !('Kst' in daten) ? null : (daten as any).Kst,
      log: true
    };
    const insertNewData = { ...insertData, ...log };
    const insertKey = await katalog.add({ ...insertData, ...log });
    if (!insertKey) {
      console.error('ArtikelService # 220 insertArtikelData(daten) empty result insertKey', { insertKey, insertNewData});
      alert('#219 ArtikelService.insertArtikelData(daten) empty Result. See console.log');
    }
    console.log('ArtikelService insertArtikelData() #223');
    return katalog.get(insertKey);
  }

  public async insertArtikelRefByGcidGcuuid(gcuuid: string): Promise<DBDIObjektKatalogMandant> {
    const db = this.dexie;
    const artikelRef = db.objektKatalogMandant;
    const jobid = this.baseData.getCurrentJobid();
    const mid = this.baseData.getCurrentMid();
    const uid = this.authService.getUser().id;
    const uuid = Guid.create().toString();
    const devID = this.baseData.getCurrentDeviceId();
    const log = { log: true };
    const d = new Date();
    const code = uuid;

    const insertData = {
      ...{ gcuuid },
      ...{
        mid,
        code,
        for_jobid: jobid,
        created_at: new Date(),
        created_uid: uid,
        created_device_id: devID,
        uuid
      },
      ...log
    } as DBDIObjektKatalogMandant;
    const mcuuid = await artikelRef.add( insertData );

    return artikelRef.get(mcuuid);
  }

  public async insertArtikelRef(daten: ArtikelBasisDaten): Promise<DBDIObjektKatalogMandant> {
    const db = this.dexie;
    const artikelRef = db.objektKatalogMandant;
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.authService.getUser().id;
    const uuid = Guid.create().toString();
    const defaultMid = this.baseData.getCurrentMid();
    const devID = this.baseData.getCurrentDeviceId();
    const log = { log: true };

    if (!daten.gcuuid) {
      console.log('ArtikelService insertArtikelRef() #265', { daten: {...daten}});
      const artikelData: DBDIObjektKatalogGlobal = await this.insertArtikelData({ ...daten, ...log});
      console.log('ArtikelService insertArtikelRef() #270 artikelData', { artikelData: {...artikelData}});
      if (!artikelData) {
        console.error('ArtikelService #267 unexpected empty Result: artikelData = this.insertArikelData()',
          { artikelData, daten });
        alert('ArikelService #269 unexpected Result for insertArtikelData. See console.log');
        return null;
      }
      daten.gcid = artikelData.gcid;
      daten.gcuuid = artikelData.uuid;
    }

    const insertData: DBDIArtikel = {
      mid: daten.mid || defaultMid,
      gcid: daten.gcid,
      gcuuid: daten.gcuuid,
      uuid,
      code: uuid,
      created_at: new Date(),
      created_uid: uid,
      created_jobid: jobid,
      created_device_id: devID,
      modified_at: null,
      modified_uid: null
    };
    const insertUuid = await artikelRef.add( {...insertData, ...log} );
    console.log('ArtikelService insertArtikelRef() #295', { uuid, insertUuid });
    return artikelRef.get({uuid: insertUuid});
  }

  public async insert(daten: ArtikelBasisDaten): Promise<DBInsertArtikelResult> {
    try {
      console.log('ArtikelService #295 insert(daten) call this.getFirstArtikelGcuuidByBasisDaten(daten)', { daten });
      try {
        const existingGcuuid = await this.getFirstArtikelGcuuidByBasisDaten(daten);
        daten.gcuuid = existingGcuuid;
      } catch (e) {
        console.error('ArtikelService #299', { e });
        throw e;
      }
      console.log('ArtikelService #303 insert(daten) call this.insertArtikelRef(daten)');
      const artikelRefData: DBDIObjektKatalogMandant = await this.insertArtikelRef( daten );
      console.log('ArtikelService #305 artikelRefData = insert(daten)', { daten, artikelRefData });
      if (!artikelRefData || !('gcuuid' in artikelRefData)) {
        alert('ERROR: #307 ArtikelService.insert() after calling ArtikelService.insertArtikelRef(daten)' +
          JSON.stringify({daten}));
        return {
          success: false,
          newId: null,
          data: null,
          newItem: null,
          artikelRef: null,
          artikelData: null
        };
      }

      const gItem = await this.dexie.objektKatalogGlobal.get( {uuid: artikelRefData.gcuuid});
      const mItem = artikelRefData;
      const item = { ...mItem, ...gItem, ...{ mcuuid: mItem.uuid } };

      return {
        success: true,
        newId: artikelRefData.uuid,
        data: artikelRefData,
        newItem: item,
        artikelRef: artikelRefData,
        artikelData: gItem
      } as DBInsertArtikelResult;
    } catch ( err ) {
      const errorMsg = ( 'name' in err ? err.name + ': ' : '')
        + ( ('message' in err) ? err.message : JSON.stringify(err) );
      return {
        success: false,
        errorMsg,
        debug: err,
        data: daten
      } as DBInsertArtikelResult;
    }
  }

  public async getFirstArtikelGcuuidByBasisDaten(properties: ArtikelBasisDaten): Promise<string> {
    if ( ('Hersteller' in properties) && properties.Hersteller.length > 0) {
      const hst = await this.herstellerService.getByName(properties.Hersteller);
      if (hst && hst.uuid) {
        properties.huuid = hst.uuid;
      } else {
        return '';
      }
    }

    const filledProps: any = {};
    const emptyProps: any = {};
    for (const pName of Object.keys(properties)) {
      if (!(pName in properties)) {
        continue;
      }
      if (properties[pName] !== '' && properties[pName] !== null) {
        filledProps[pName] = properties[pName];
      } else {
        emptyProps[pName] = properties[pName];
      }
    }

    if (Object.keys(filledProps).length === 0) {
      return '';
    }

    if (!('huuid' in filledProps) && !('Bezeichnung' in filledProps)) {
      return '';
    }

    let query: Dexie.Collection<DBDIObjektKatalogGlobal, string>;

    if (properties.huuid && 'huuid' in filledProps) {
      query = this.dexie.objektKatalogGlobal.where({huuid: properties.huuid});
      delete filledProps.huuid;
    } else if (properties.Bezeichnung && 'Bezeichnung' in filledProps) {
      query = this.dexie.objektKatalogGlobal.where('Bezeichnung').equalsIgnoreCase(properties.Bezeichnung);
      delete filledProps.Bezeichnung;
    }

    query.filter( (okg) => {
      for (const k of Object.keys(filledProps)) {
        if ( (k in okg) && okg[k] !== filledProps[k]) {
          return false;
        }
      }
      for (const k of Object.keys(emptyProps)) {
        if (!(k in okg) || okg[k] === emptyProps[k]) {
          continue;
        }
        if (okg[k] !== null && okg[k] !== '') {
          return false;
        }
      }
      return true;
    }).first().then( (okg) => {
      if (okg && ('uuid' in okg)) {
        return okg.uuid;
      } else {
        return '';
      }
    });
  }

  public async __DEL__update(artikel: DBDIArtikel): Promise<DBUpdateArtikelResult> {
    return {
      success: false
    };
  }

  public async countArticleByHerstellerUuid(huuid: string): Promise<number> {
    const artikelTbl = this.dexie.objektKatalogGlobal;
    return await artikelTbl.where({ huuid }).count();
  }

  public async countArticleByProperties(props: ArtikelPropertiesForQueryCount): Promise<number> {
    const artikelTbl = this.dexie.objektKatalogGlobal;
    let query: any = artikelTbl;
    const propKeys = Object.keys( props );
    propKeys.forEach( k => { if (!props[k]) { delete props[k]; }});
    if (props.huuid) {
      query = artikelTbl.where({ huuid: props.huuid });
      delete props.huuid;
    }
    if (!('filter' in query)) {
      throwError('query has an Unexpected Type. ' +
        'Expected Collection|Table with method filter! Given: ' + (typeof query));
    }
    return await query.filter( props ).count();
  }


  public async listArticleByProperties(
    mid: number, hstId: string|number, props: ArtikelPropertiesForQueryCount
  ): Promise<ArtikelHerstellerImg[]> {
    const huuid = (typeof hstId === 'string') ? hstId : null;

    let propKeys = Object.keys( props );
    propKeys.forEach( k => {
      if (!props[k]) {
        delete props[k];
      } else if (typeof props[k] === 'string') {
        props[k] = (props[k] as string).toLowerCase();
      }
    });
    propKeys = Object.keys( props );

    const join: JoinFlexFormatted = {
      table: 'objektKatalogGlobal',
      where: (huuid) ? { huuid } : null,
      joins: [
        { parentKey: 'huuid', key: 'uuid', table: 'hersteller', alias: 'hersteller', resultType: JoinResultType.First },
        { parentKey: 'uuid', table: 'images', key: 'gcuuid', alias: 'image', resultType: JoinResultType.First },
        { parentKey: 'uuid', table: 'objektKatalogMandant', key: 'gcuuid', alias: 'artikelRef', multi: true,
          where: { mid },
          joins: [{
            parentKey: 'uuid', table: 'inventar', key: 'mcuuid', alias: 'inventar_count', multi: true,
            resultType: JoinResultType.Count,
            map: (obj: DBDIInventar) => ({ uuid: obj.uuid, ruuid: obj.ruuid })
          }],
          filter: (obj: DBDIObjektKatalogMandant) => obj.mid === mid
      }],
      filter: (item: DBDIObjektKatalogGlobal): boolean => {
        for (const k of propKeys) {
          if (!(k in item)) {
            return false;
          }
          if (typeof props[k] === 'string' && typeof item[k] === 'string') {
            if (-1 === item[k].toLowerCase().indexOf( props[k] )) {
              return false;
            }
          } else if (props[k] !== item[k]) {
            return false;
          }
        }
        return true;
      },
      map: (obj: any) => {
        obj.gcuuid = obj.uuid;
        obj.inventar_count = 0;
        obj.Hersteller = '';
        obj.img_id = null;
        obj.img_uuid = null;
        obj.mcid = null;
        obj.mcuuid = null;

        if (obj.hersteller !== undefined && obj.hersteller !== null) {
          obj.Hersteller = obj.hersteller.Hersteller;
        }

        if (obj.image !== undefined && obj.image !== null ) {
          obj.img_id = obj.image.id;
          obj.img_uuid = obj.image.uuid;
        }

        if (Array.isArray(obj.artikelRef)) {
          obj.artikelRef.forEach( (a) => obj.inventar_count += a.inventar_count);
          obj.mcid = (obj.artikelRef.length) ? obj.artikelRef[0].mcid : null;
          obj.mcuuid = (obj.artikelRef.length) ? obj.artikelRef[0].mcuuid : null;
        } else if (!!obj.artikelRef) {
          obj.inventar_count = obj.artikelRef.inventar_count;
          obj.mcid = obj.artikelRef.mcid;
          obj.mcuuid = obj.artikelRef.mcuuid;
        }
        return obj;
      },
      sort: (a: any, b: any) => {
        const r = ('inventar_count' in a) && ('inventar_count' in b)
        ? (a.inventar_count > b.inventar_count ? -1 : 1)
        : 0;
        // console.log('#311 sort joinie result', a.inventar_count, b.inventar_count, r);
        return r;
      },
      limit: 10
    };

    return this.dataService.joinie( join ).then( (list) => {
      console.log( { 'joinie.result': list });
      return list as ArtikelHerstellerImg[];
    });
  }

  async getGroupedArtikelGruppen(where?: TableIdxProps): Promise<string[]> {
    return this.getGroupedArtikelProperties('Gruppe', where);
  }

  async getGroupedArtikelKategorien(where?: TableIdxProps): Promise<string[]> {
    return this.getGroupedArtikelProperties('Kategorie', where);
  }

  async getGroupedArtikelTypen(where?: TableIdxProps): Promise<string[]> {
    return this.getGroupedArtikelProperties('Typ', where);
  }

  async getGroupedArtikelGroessen(where?: TableIdxProps): Promise<string[]> {
    return this.getGroupedArtikelProperties('Groesse', where);
  }

  async getGroupedArtikelFarben(where?: TableIdxProps): Promise<string[]> {
    return this.getGroupedArtikelProperties('Farbe', where);
  }

  async getGroupedArtikelProperties(property: string, where?: TableIdxProps): Promise<string[]> {
    const db = this.dexie;
    const table = db.objektKatalogGlobal;
    const names: string[] = [];
    const hasWhere = where && Object.keys(where).length > 0;
    const keysWhere = (hasWhere) ? Object.keys(where) : [];
    const collection = (hasWhere) ? table.where(where) : table.toCollection();

    const uniqNames = await table.orderBy(property).filter( itm => {
      if (!(property in itm) || typeof itm[property] !== 'string' || itm[property].trim() === '') {
        return false;
      }
      if (!hasWhere) {
        return true;
      }
      for (const k of keysWhere) {
        if (!(k in itm)) {
          return false;
        }
        if (typeof itm[k] === 'string' && typeof where[k] === 'string' ) {
          if (itm[k].toString().toLowerCase().trim() !== where[k].toString().toLowerCase().trim() ) {
            return false;
          }
        } else if (itm[k] !== where[k] ) {
          return false;
        }
      }
      return true;
    })
      .uniqueKeys();

    uniqNames.forEach( (n) => {
      if (typeof n === 'string') {
        names.push(n);
      }
    });
    return names;
  }


  async getGroupedArtikelGruppenKategorien(where?: TableIdxProps): Promise<{gruppe: string, kategorien: string[]}[]> {
    console.log('#364 getGroupedArtikelGruppenKategorien', { where });
    const db = this.dexie;
    const Promise = Dexie.Promise;
    const table = db.objektKatalogGlobal;

    const uniqGrps = await table.orderBy('Gruppe').uniqueKeys();

    return Promise.all(
      uniqGrps.map( async (grp) => table.orderBy('Kategorie')
        .filter( (itm) => itm.Gruppe === grp && typeof itm.Kategorie === 'string' && itm.Kategorie.trim() !== '')
        .uniqueKeys() )
    ).then( (ktgs) => {
      return uniqGrps.map( (grp, i) => ({gruppe: grp.toString(), kategorien: ktgs[i] as string[] }));
    });
  }
}
