import { Injectable } from '@angular/core';
import {DBDIInventar, DexieService} from '../../dexie.service';
import { InventarData } from '../../inventory/service/data.service';
import {Guid} from 'guid-typescript';
import {BasedataService} from '../../basedata.service';

@Injectable({
  providedIn: 'root'
})
export class InventarService {

  constructor(private dexie: DexieService,
              private baseData: BasedataService) { }

  getHello(): string {
    return 'hello';
  }

  async insertInventar(inventar: DBDIInventar, useJobid?: number): Promise<number> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const item = {
      mcid: inventar.mcid,
      uuid: Guid.create().toString(),
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

    const rs = await this.dexie.inventar.add(item);
    return rs;
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
