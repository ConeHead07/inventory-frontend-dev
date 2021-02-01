import { Injectable } from '@angular/core';
import {DBDIHersteller} from '../../dexie.interfaces';
import {DexieService} from '../../dexie.service';
import {BasedataService} from '../../basedata.service';
import { Guid} from 'guid-typescript';

export interface HerstellerWithId {
  Hersteller: string;
  uuid: string;
}

@Injectable({
  providedIn: 'root'
})
export class HerstellerService {

  constructor(private dexie: DexieService,
              private baseData: BasedataService) { }

  async getAll(): Promise<DBDIHersteller[]> {
    return await this.dexie.hersteller.orderBy('Hersteller').toArray();
  }

  async getAllHerstellerWithUuids(): Promise<HerstellerWithId[]> {
    const result: HerstellerWithId[] = [];
    return this.dexie.hersteller.orderBy('Hersteller')
      .each( hst => {
        result.push({
          Hersteller: hst.Hersteller,
          uuid: hst.uuid
        });
      })
      .then( () => result );
  }

  async getByNameOrCreate(name: string): Promise<DBDIHersteller> {
    const hstExisting = await this.getByName(name);
    if (hstExisting) {
      return hstExisting;
    }
    return this.createAndGetData(name);
  }

  async getByName(name: string): Promise<DBDIHersteller> {
    console.log('called HerstellerService.getByName(name)');
    const exakt = await this.dexie.hersteller.where( { Hersteller: name}).first();
    if (exakt !== undefined) {
      console.log('Found Hersteller with strict compare-search');
      return exakt;
    }
    const fuzzy = await this.dexie.hersteller.filter( item => item.Hersteller.trim().toLowerCase() === name.trim().toLowerCase()).first();
    if (fuzzy === undefined) {
      console.log('Not Found Hersteller with strict compare-search, found with caseinsensitive');
    } else {
      console.error('Hersteller not found!');
    }
    return fuzzy;
  }

  async create(name: string): Promise<string> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const uuid = Guid.create().toString();

    await this.dexie.hersteller.add({
      Hersteller: name,
      uuid,
      for_jobid: jobid,
      created_at: new Date(),
      created_uid: uid,
      created_jobid: jobid
    });
    return uuid;
  }

  async createAndGetData(name: string): Promise<DBDIHersteller> {
    const uuid = await this.create(name);
    return this.dexie.hersteller.get({ uuid });
  }
}
