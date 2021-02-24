import {EventEmitter, Injectable} from '@angular/core';
import {DBDIRaeume, DBDIRaumEditStatus} from '../../../shared/interfaces/dexie.interfaces';
import { DexieService } from '../../../shared/services/dexie.service';
import {Guid} from 'guid-typescript';
import {AuthService} from '../../auth/auth.service';
import {DbInsertResult, DbUpdateResult} from './data-interfaces';
import {throwError} from 'rxjs';
import {BasedataService} from '../../../shared/services/basedata.service';

export interface RaumBasisDaten {
  gid?: number;
  Raum?: string;
  Raumbezeichnung?: string;
  Etage?: string;
  code?: string;
}

export interface DBInsertRaumResult extends DbInsertResult {
  newItem?: DBDIRaeume;
}

export interface DBUpdateRaumResult extends DbUpdateResult {
  item?: DBDIRaeume;
}

export interface RaumIDAndStatus {
  uuid: string;
  status: DBDIRaumEditStatus;
}

export interface RaumStatusProgress {
  uuid: string;
  Raum: string;
  Etage: string;
  editStatus: DBDIRaumEditStatus;
  progress: number;
  total: number;
  done: number;
}


@Injectable({
  providedIn: 'root'
})
export class RaumService {

  raumStatusChanged = new EventEmitter<RaumIDAndStatus>();

  constructor(private dexie: DexieService,
              private authService: AuthService,
              private baseDataService: BasedataService) {
  }

  public async raumExists(gid: number, raum: string): Promise<boolean> {
    const numRaeume = await this.dexie.raeume
      .where('Raum')
      .equalsIgnoreCase(raum)
      .filter(itm => itm.gid === gid)
      .count();

    return 0 < numRaeume;
  }

  public async raumBezeichnungExists(gid: number, bezeichnung: string): Promise<boolean> {
    const numRaeume = await this.dexie.raeume
      .where('Raumbezeichnung')
      .equalsIgnoreCase(bezeichnung)
      .filter(itm => itm.gid === gid)
      .count();

    return 0 < numRaeume;
  }

  public async codeExistsInInventur(jobid: number, ruuid: string, code: string): Promise<boolean> {
    const raeume = this.dexie.raeume
      .where('code')
      .equalsIgnoreCase(code.trim())
      .filter(itm => itm.uuid !== ruuid && itm.for_jobid !== jobid);

    const numRaeume = await this.dexie.raeume
      .where('code')
      .equalsIgnoreCase(code.trim())
      .filter(itm => itm.uuid !== ruuid && itm.for_jobid !== jobid)
      .count();
    const exists = 0 < numRaeume;

    console.log('#85 raum.service.ts codeExistsInInventur', {
      params: {
        jobid,
        ruuid,
        code
      },
      result: {
        exists,
        raeume,
        numRaeume
      }
    });
    return exists;
  }

  public async raumExistsInInventur(jobid: number, ruuid: string, Raum: string): Promise<boolean> {
    const numRaeume = await this.dexie.raeume
      .where('Raum')
      .equalsIgnoreCase(Raum.trim())
      .filter(itm => itm.uuid !== ruuid && itm.for_jobid !== jobid)
      .count();

    return 0 < numRaeume;
  }

  async get(uuid: string): Promise<DBDIRaeume> {
    return this.dexie.raeume.get(uuid);
  }

  public async insert(daten: RaumBasisDaten, useJobId?: number): Promise<DBInsertRaumResult> {
    const jobid = useJobId || this.baseDataService.getCurrentJobid();

    const insertData: DBDIRaeume = {
      gid: daten.gid,
      uuid: Guid.create().toString(),
      hash: '',
      for_jobid: jobid,
      code: daten.code,
      raumid: '',
      Raum: daten.Raum,
      Raumbezeichnung: daten.Raumbezeichnung,
      Etage: daten.Etage,
      created_at: new Date(),
      created_jobid: jobid,
      created_uid: this.authService.getUser().id,
      modified_at: null,
      modified_uid: null
    };
    const log = { log: true };

    let newId = '';
    let newItem = null;
    try {
      newId = await this.dexie.raeume.add( { ...insertData, ...log });
      newItem = await this.dexie.raeume.get(newId);
    } catch (err) {
      const errorMsg = ( ('name' in err) ? err.name + ': ' : '')
        + ( ('message' in err) ? err.message : JSON.stringify(err));
      return {
        success: false,
        errorMsg,
        debug: err,
        data: insertData
      } as DBInsertRaumResult;
    }

    console.log('insert Raum ', {newItem});
    return {
      success: true,
      newId,
      newItem
    };
  }

  public async updateByUuid(uuid: string, raum: DBDIRaeume|RaumBasisDaten): Promise<DBUpdateRaumResult> {
    console.log('#162 raum.service.ts updateById:', { uuid, raum });
    const jobid = this.baseDataService.getCurrentJobid();
    const savedRaumData = await this.dexie.raeume.get(uuid);

    const hasUuid = ('uuid' in raum) && (typeof raum.uuid === 'string') && raum.uuid !== '';
    const updUuid = hasUuid && ('uuid' in raum)  ? raum.uuid : uuid;

    if (savedRaumData.code && savedRaumData.code !== raum.code) {
      const lkupKey = {
        code: savedRaumData.code,
        for_jobid: jobid
      };
      console.log('#172 raum.service.ts Raum-Code has changed', { lkupKey });
      const bcItem = await this.dexie.barcodeLookup.get(lkupKey);
      console.log('#174 raum.service.ts check if bcItem exists', { bcItem });
      if (bcItem) {
        await this.dexie.barcodeLookup.delete([savedRaumData.code, jobid]).catch( (reason) => {
          console.error('#177 Alter BC-Lookup fuer Raum konnte nicht geloescht werden!', { reason });
        });
      }

      console.log('#184 raum.service.ts create new bcItem', {
        code: raum.code,
        for_jobid: jobid,
        id: uuid,
        key: 'uuid',
        table: 'raeume',
        updateHelper: 1,
        uuid: updUuid
      });

      if (raum.code) {
        this.dexie.barcodeLookup.put({
          code: raum.code,
          for_jobid: jobid,
          key: 'uuid',
          table: 'raeume',
          updateHelper: 1,
          uuid: updUuid
        });
      }
    } else if (raum.code) {
      const bcItem = await this.dexie.barcodeLookup.get({code: raum.code, for_jobid: jobid});
      if (!bcItem) {
        this.dexie.barcodeLookup.put({
          code: raum.code,
          for_jobid: jobid,
          key: 'uuid',
          table: 'raeume',
          updateHelper: 1,
          uuid: updUuid
        });
      }
    }

    console.log('#205 raum.service.ts update raum', { uuid, raum });
    const numChanges = await this.dexie.raeume.update(uuid, raum);
    const savedData = await this.dexie.raeume.get(uuid);
    console.log('#208 raum.service.ts get updated raumItem', { uuid, savedData, return: {
        success: numChanges > 0,
        id: uuid,
        item: savedData,
        data: raum
      }});
    return {
      success: numChanges > 0,
      id: uuid,
      item: savedData,
      data: raum
    };
  }

  public async __DEL__updateByUuid(uuid: string, raum: DBDIRaeume|RaumBasisDaten): Promise<DBUpdateRaumResult> {
    const numChanges = await this.dexie.raeume.where({ uuid }).modify(raum);
    const savedData = await this.dexie.raeume.where({ uuid }).first();
    return {
      success: numChanges > 0,
      id: savedData.uuid,
      item: savedData,
      data: raum
    };
  }

  public async getEtagenByGidInInventur(jobid: number, gid: number): Promise<string[]> {
    const etagen: string[] = [];
    return this.dexie.raeume
      .where({ for_jobid: jobid, gid }).each( raum => {
      if (etagen.indexOf(raum.Etage) === -1) {
        etagen.push( raum.Etage );
      }
    }).then( () => etagen );
  }

  public async getRaumStatus(uuid: string): Promise<DBDIRaumEditStatus> {
    const raum = await this.dexie.raeume.get(uuid);
    if (raum) {
      return raum.current_jobstatus;
    }
    throwError( `ERROR - GetRaumStatus: Raum mit ID ${uuid} wurde nicht gefunden`);
  }

  public async triggerRaumStatus(uuid: string): Promise<void> {
    const raum = await this.dexie.raeume.get(uuid);
    this.raumStatusChanged.emit({
      uuid,
      status: raum.current_jobstatus
    });
  }


  public async setRaumStatus(stat: DBDIRaumEditStatus, uuid: string, jobid: number): Promise<number> {
    const log = true;
    const numChanges = await this.dexie.raeume.where({uuid}).modify({
      current_jobstatus: stat,
      current_jobid: jobid,
      log
    });

    if (numChanges) {
      this.triggerRaumStatus(uuid);
    }
    return numChanges;
  }

  public async setRaumStatusInit(uuid: string, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Init, uuid, jobid);
  }

  public async setRaumStatusStarted(uuid: string, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Started, uuid, jobid);
  }

  public async setRaumStatusClosed(uuid: string, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Closed, uuid, jobid);
  }

  public async getRaeumeStartedByGebaeudeId(gid: number, jobid: number): Promise<RaumStatusProgress[]> {
    const raeume = await this.dexie.raeume.where({ gid }).toArray();
    const raeumeStat = await Promise.all( raeume.map( (raum: DBDIRaeume) => {
      return Promise.all([
        this.dexie.inventar.where({ ruuid: raum.uuid }).count(),
        this.dexie.inventar.where({ ruuid: raum.uuid, jobid }).count()
        ]).then( (results) => {
          const total = results[0];
          const done = results[1];
          const progress = total > 0 ? done * 100 / total : -1;

          return {
            uuid: raum.uuid,
            Raum: raum.Raum,
            Etage: raum.Etage,
            editStatus: raum.current_jobstatus,
            progress,
            total,
            done
          } as RaumStatusProgress;
      });
    }));

    return raeumeStat.filter( stat => stat.editStatus === DBDIRaumEditStatus.Closed || stat.done > 0);
  }

  public async getRaeumeToDoByGebaeudeId(gid: number, jobid: number): Promise<RaumStatusProgress[]> {
    const raeume = await this.dexie.raeume
      .where({ gid } )
      .and( r => r.current_jobstatus !== DBDIRaumEditStatus.Closed).toArray();

    const raeumeStat = await Promise.all(raeume.map( (raum: DBDIRaeume) => {
      return Promise.all([
        this.dexie.inventar.where({ ruuid: raum.uuid }).count(),
        this.dexie.inventar.where({ ruuid: raum.uuid, jobid }).count()
      ]).then( (results) => {
        return {
          uuid: raum.uuid,
          Raum: raum.Raum,
          Etage: raum.Etage,
          progress: 0,
          editStatus: raum.current_jobstatus,
          total: results[0],
          done: results[1]
        };
      });
    }));
    return raeumeStat.filter( stat => stat.done === 0);
  }
}
