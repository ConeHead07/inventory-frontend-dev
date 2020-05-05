import { Injectable } from '@angular/core';
import {DBDIInventar, DBDIRaeume, DexieService} from './dexie.service';
import {BasedataService} from './basedata.service';

export interface InventoryProgress {
  total: number;
  done: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryProgressService {

  constructor(private dexieService: DexieService, private baseData: BasedataService) { }

  async getCurrentGebaeudeProgress(useGid?: number): Promise<InventoryProgress> {
    const gid = useGid || this.baseData.getCurrentGid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getGebaeudeProgressByGidAndJobid(gid, jobid);
  }

  async getGebaeudeProgressByGidAndJobid(gid: number, jobid: number): Promise<InventoryProgress> {
    const progress: InventoryProgress = {
      total: 0,
      done: 0,
    };

    const ridList = await this.dexieService.raeume
      .where({ gid })
      .toArray()
      .then<number[]>( (list) => list.map( itm => itm.rid) );

    await Promise.all([
      this.dexieService.inventar.where( 'rid' ).anyOf(ridList).count(),
      this.dexieService.inventar.where( 'rid' ).anyOf(ridList).and( itm => itm.jobid === jobid).count()
      ]).then( totalAndProgress => {
        progress.total = totalAndProgress[0];
        progress.done = totalAndProgress[1];
      });

    return progress;
  }

  async getCurrentRaumProgress(useRid?: number): Promise<InventoryProgress> {
    const rid = useRid || this.baseData.getCurrentRid();
    const jobid = this.baseData.getCurrentJobid();
    console.log('getCurrentRaumProgress calls getRaumProgressByRidAndJobid', { rid, jobid });

    return this.getRaumProgressByRidAndJobid(rid, jobid);
  }

  async getRaumProgressByRidAndJobid(rid: number, jobid: number): Promise<InventoryProgress> {
    const progress: InventoryProgress = {
      total: 0,
      done: 0,
    };

    await Promise.all([
      this.dexieService.inventar.where( { rid } ).count(),
      this.dexieService.inventar.where( { rid } ).and( itm => itm.jobid === jobid).count()
    ]).then( totalAndProgress => {
      progress.total = totalAndProgress[0];
      progress.done = totalAndProgress[1];
    });
    console.log('called getRaumProgressByRidAndJobid', { rid, jobid, progress });

    return progress;
  }

  async getCurrentRaumInventarFound(useRid?: number): Promise<DBDIInventar[]> {
    const rid = useRid || this.baseData.getCurrentRid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getRaumInventarFoundByRidAndJobid(rid, jobid);
  }

  async getRaumInventarFoundByRidAndJobid(rid: number, jobid: number): Promise<DBDIInventar[]> {
    return this.dexieService.inventar.where({ rid, jobid }).toArray();
  }

  async getCurrentRaumInventarNotFound(useRid?: number): Promise<DBDIInventar[]> {
    const rid = useRid || this.baseData.getCurrentRid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getRaumInventarNotFoundByRidAndJobid(rid, jobid);
  }

  async getRaumInventarNotFoundByRidAndJobid(rid: number, jobid: number): Promise<DBDIInventar[]> {
    return this.dexieService.inventar.where({ rid }).and( item => item.jobid !== jobid).toArray();
  }

  async getCurrentGebaeudeRaeumeFinished(useGid?: number): Promise<DBDIRaeume[]> {
    const gid = useGid || this.baseData.getCurrentGid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getGebaeudeRaeumeFinishedByGidAndJobid(gid, jobid);
  }

  async getGebaeudeRaeumeFinishedByGidAndJobid(gid: number, jobid: number): Promise<DBDIRaeume[]> {
    return this.dexieService.raeume
      .where({ gid })
      .and( itm => itm.current_jobid === jobid && itm.current_jobstatus === 2)
      .toArray();
  }

  async getCurrentGebaeudeRaeumeNotFinished(useGid: number): Promise<DBDIRaeume[]> {
    const gid = useGid || this.baseData.getCurrentGid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getGebaeudeRaeumeNotFinishedByGidAndJobid(gid, jobid);
  }

  async getGebaeudeRaeumeNotFinishedByGidAndJobid(gid: number, jobid: number): Promise<DBDIRaeume[]> {
    return this.dexieService.raeume
      .where({ gid })
      .and( itm => itm.current_jobid !== jobid || itm.current_jobstatus !== 2)
      .toArray();
  }
}
