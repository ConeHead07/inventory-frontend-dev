import {EventEmitter, Injectable, Output} from '@angular/core';
import {DBDIInventar, DBDIInventurenUserStatus, DBDIJobLockStatus, DBDIRaeume} from '../interfaces/dexie.interfaces';
import { DexieService } from '../services/dexie.service';
import {BasedataService} from '../services/basedata.service';

export interface InventoryProgress {
  total: number;
  done: number;
}

export interface RaumInventoryProgress extends InventoryProgress {
  uuid: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryProgressService {
  @Output() inventurLockStatusChanged = new EventEmitter<DBDIJobLockStatus>();
  @Output() raumProgressChanged = new EventEmitter<RaumInventoryProgress>();

  constructor(private dexieService: DexieService, private baseData: BasedataService) { }

  async getCurrentInventurLockStatus(): Promise<DBDIJobLockStatus> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const deviceId = this.baseData.getCurrentDeviceId();

    return this.dexieService.inventurenUserStatus.get([jobid, uid, deviceId])
      .then( (item) => {
        if (item) {
          return item.status;
        }
      })
      .catch(() => {
        return DBDIJobLockStatus.Init;
      });
  }

  async setCurrentInventurLockStatusClosed(): Promise<boolean> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const deviceId = this.baseData.getCurrentDeviceId();
    const status = DBDIJobLockStatus.Locked;
    console.log('InventoryProgressService #40 setCurrentInventurLockStatusClosed',
      { jobid, uid, deviceId, status });

    const exists = await this.dexieService.inventurenUserStatus
      .where({jobid, uid, device_id: deviceId})
      .count();

    console.log('InventoryProgressService #46 setCurrentInventurLockStatusClosed', { exists });
    if (exists) {
      return this.dexieService.inventurenUserStatus
        .update([jobid, uid, deviceId], {
          status,
          geschlossen_am: new Date(),
          modified_at: new Date()
        })
        .then( () => {
          console.log('InventoryProgressService #55 setCurrentInventurLockStatusClosed update emit Status Locked');
          this.inventurLockStatusChanged.emit( status );
          return true;
      })
        .catch( () => {
          return false;
        });
    } else {
      console.log('InventoryProgressService #63 setCurrentInventurLockStatusClosed insert Status Locked');
      const insertKey = [jobid, uid, deviceId];
      const insertDaten: DBDIInventurenUserStatus = {
        jobid,
        uid,
        device_id: deviceId,
        token: '',
        status: DBDIJobLockStatus.Locked,
        geladen_am: new Date(),
        geschlossen_am: new Date(),
        created_at: new Date(),
        modified_at: new Date()
      };
      return this.dexieService.inventurenUserStatus
        .add(insertDaten)
        .then( () => {
          console.log('InventoryProgressService #77 setCurrentInventurLockStatusClosed inserted emit Status Locked');
          this.inventurLockStatusChanged.emit( status );
          return true;
        })
        .catch( (reason) => {
          console.error('InventoryProgressService #83 Status Locked konnte nicht gesetzt werden', { reason, insertDaten });
          return false;
        });
    }
  }

  async setCurrentInventurLockStatusOpened(): Promise<boolean> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const deviceId = this.baseData.getCurrentDeviceId();
    const status = DBDIJobLockStatus.Unlocked;
    console.log('InventoryProgressService #88 setCurrentInventurLockStatusOpened',
      { jobid, uid, deviceId, status });

    const exists = await this.dexieService.inventurenUserStatus
      .where({jobid, uid, device_id: deviceId})
      .count();

    if (exists) {
      return this.dexieService.inventurenUserStatus
        .update([jobid, uid, deviceId], {
        status,
        geschlossen_am: new Date(),
        modified_at: new Date()
      })
        .then( () => {
          this.inventurLockStatusChanged.emit( status );
          return true;
        })
        .catch( () => {
          return false;
        });
    } else {
      const insertKey: [number, number, number ] = [jobid, uid, deviceId];
      const insertDaten: DBDIInventurenUserStatus = {
        jobid,
        uid,
        device_id: deviceId,
        token: '',
        status,
        geladen_am: new Date(),
        geschlossen_am: null,
        created_at: new Date(),
        modified_at: new Date()
      };
      return this.dexieService.inventurenUserStatus
        .put(insertDaten, insertKey)
        .then( () => {
          this.inventurLockStatusChanged.emit( status );
          return true;
        })
        .catch( (reason) => {
          console.error('InventoryProgressService #137 Status Opened konnte nicht gesetzt werden',
            { reason, insertKey, insertDaten });
          return false;
        });
    }
  }

  async getCurrentGebaeudeProgress(useGid?: number): Promise<InventoryProgress> {
    const gid = useGid || this.baseData.getCurrentGid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getGebaeudeProgressByGidAndJobid(gid, jobid);
  }

  async getGebaeudeProgressByGidAndJobid(gid: number, jobid: number): Promise<InventoryProgress> {
    const db = this.dexieService;
    const raeume = db.raeume;
    const inventar = db.inventar;

    const progress: InventoryProgress = {
      total: 0,
      done: 0,
    };

    const ruuidListTmp = await raeume.where( {gid}).toArray();
    const ruuidList = ruuidListTmp.filter( (rg) => rg.gid === gid && rg.for_jobid === jobid).map( (rg) => rg.uuid);

    const chunkSize = Math.ceil( ruuidList.length / 8 );
    const chunks = [];
    for (let i = 0; i < ruuidList.length; i += chunkSize) {
      chunks.push( ruuidList.slice(i, i + chunkSize) );
    }

    return await Promise.all([
      inventar.where( { jobid } ).count(),
      Promise.all(
          chunks.map( async (ruuidChunkList) => inventar
              .where( 'ruuid' ).anyOf( ruuidChunkList )
              .and((inv) => inv.for_jobid === jobid)
              .count()
          )
      )
    ]).then( (chunksTotalAndProgress) => {
      console.log({chunksTotalAndProgress});
      progress.done = chunksTotalAndProgress[0];
      progress.total = chunksTotalAndProgress[1].reduce( (sum, chnk) => sum + chnk, 0);
      return progress;
    });
  }

  async getCurrentRaumProgress(useRuuid?: string): Promise<InventoryProgress> {
    const uuid = useRuuid || this.baseData.getCurrentRuuid();
    const jobid = this.baseData.getCurrentJobid();
    console.log('getCurrentRaumProgress calls getRaumProgressByRidAndJobid', { uuid, jobid });

    return this.getRaumProgressByUuidAndJobid(uuid, jobid).then( (progress) => {
      this.raumProgressChanged.emit({uuid, ...progress});
      return progress;
    });
  }

  async getRaumProgressByUuidAndJobid(uuid: string, jobid: number): Promise<InventoryProgress> {
    const progress: InventoryProgress = {
      total: 0,
      done: 0,
    };

    await Promise.all([
      this.dexieService.inventar.where( { ruuid: uuid } ).count(),
      this.dexieService.inventar.where( { ruuid: uuid } ).and(itm => itm.jobid === jobid).count()
    ]).then( totalAndProgress => {
      progress.total = totalAndProgress[0];
      progress.done = totalAndProgress[1];
    });
    console.log('called getRaumProgressByUuidAndJobid', { uuid, jobid, progress });

    return progress;
  }

  async getCurrentRaumInventarFound(useRuuid?: string): Promise<DBDIInventar[]> {
    const ruuid = useRuuid || this.baseData.getCurrentRuuid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getRaumInventarFoundByRuuidAndJobid(ruuid, jobid);
  }

  async getRaumInventarFoundByRuuidAndJobid(ruuid: string, jobid: number): Promise<DBDIInventar[]> {
    return this.dexieService.inventar.where({ ruuid, jobid }).toArray();
  }

  async getCurrentRaumInventarNotFound(useRuuid?: string): Promise<DBDIInventar[]> {
    const ruuid = useRuuid || this.baseData.getCurrentRuuid();
    const jobid = this.baseData.getCurrentJobid();

    return this.getRaumInventarNotFoundByRuuidAndJobid(ruuid, jobid);
  }

  async getRaumInventarNotFoundByRuuidAndJobid(ruuid: string, jobid: number): Promise<DBDIInventar[]> {
    return this.dexieService.inventar.where({ ruuid }).and(item => item.jobid !== jobid).toArray();
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
