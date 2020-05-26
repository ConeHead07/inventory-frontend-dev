import {EventEmitter, Injectable} from '@angular/core';
import {DBDIRaeume, DBDIRaumEditStatus, DexieService} from '../../dexie.service';
import {Guid} from 'guid-typescript';
import {AuthService} from '../../auth/auth.service';
import {DbInsertResult, DbUpdateResult} from './data-interfaces';
import {throwError} from 'rxjs';

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
  rid: number;
  status: DBDIRaumEditStatus;
}

export interface RaumStatusProgress {
  rid: number;
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

  constructor(private dexie: DexieService, private authService: AuthService) {
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

  public async insert(daten: RaumBasisDaten): Promise<DBInsertRaumResult> {
    const insertData: DBDIRaeume = {
      gid: daten.gid,
      uuid: Guid.create().toString(),
      hash: '',
      code: '',
      raumid: '',
      Raum: daten.Raum,
      Raumbezeichnung: daten.Raumbezeichnung,
      Etage: daten.Etage,
      created_at: new Date(),
      created_uid: this.authService.getUser().id,
      modified_at: null,
      modified_uid: null
    };

    let newId = 0;
    let newItem = null;
    try {
      newId = await this.dexie.raeume.add(insertData);
      newItem = await this.dexie.raeume.get(newId);
    } catch (err) {
      const errorMsg = ('name' in err ? err.name + ': ' : '')
        + ('message' in err ? err.message : JSON.stringify(err));
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

  public async update(raum: DBDIRaeume): Promise<DBUpdateRaumResult> {
    return {
      success: false
    };
  }

  public async getRaumStatus(rid: number): Promise<DBDIRaumEditStatus> {
    const raum = await this.dexie.raeume.get(rid);
    if (raum) {
      return raum.current_jobstatus;
    }
    throwError( `ERROR - GetRaumStatus: Raum mit ID ${rid} wurde nicht gefunden`);
  }

  public async triggerRaumStatus(rid: number): Promise<void> {
    const raum = await this.dexie.raeume.get(rid);
    this.raumStatusChanged.emit({
      rid,
      status: raum.current_jobstatus
    });
  }


  public async setRaumStatus(stat: DBDIRaumEditStatus, rid: number, jobid: number): Promise<number> {
    const numChanges = await this.dexie.raeume.where({rid}).modify({
      current_jobstatus: stat,
      current_jobid: jobid,
    });

    if (numChanges) {
      this.triggerRaumStatus(rid);
    }
    return numChanges;
  }

  public async setRaumStatusInit(rid: number, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Init, rid, jobid);
  }

  public async setRaumStatusStarted(rid: number, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Started, rid, jobid);
  }

  public async setRaumStatusClosed(rid: number, jobid: number): Promise<number> {
    return await this.setRaumStatus(DBDIRaumEditStatus.Closed, rid, jobid);
  }

  public async getRaeumeStartedByGebaeudeId(gid: number, jobid: number): Promise<RaumStatusProgress[]> {
    const raeume = await this.dexie.raeume.where({ gid }).toArray();
    const raeumeStat = await Promise.all( raeume.map( (raum: DBDIRaeume) => {
      return Promise.all([
        this.dexie.inventar.where({ rid: raum.rid }).count(),
        this.dexie.inventar.where('[rid+jobid]').equals([raum.rid, jobid]).count()
        ]).then( (results) => {
          const total = results[0];
          const done = results[1];
          const progress = total > 0 ? done * 100 / total : -1;

          return {
            rid: raum.rid,
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
        this.dexie.inventar.where({ rid: raum.rid }).count(),
        this.dexie.inventar.where('[rid+jobid]').equals([raum.rid, jobid]).count()
      ]).then( (results) => {
        return {
          rid: raum.rid,
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
