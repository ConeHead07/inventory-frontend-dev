import {EventEmitter, Injectable} from '@angular/core';
import {ApiService} from './api.service';
import {BasedataService} from './basedata.service';
import {DBDIClientChangeLog, DBDIInventuren, DexieService} from './dexie.service';
import {ConnectionService} from './connection-service.service';
import {VariablesService} from './inventory/service/variables.service';

interface SyncServerResponse {
  YourData?: {
    jobid?: number,
    params?: object
  };
  success: boolean;
  errorMsg?: string;
  syncedLogIds: number[];
  setClientDeviceId?: number;
  serverChangeLogs?: SyncServerChangeLog[];
}

interface SyncServerChangeLog {
  id?: number;
  jobid?: number;
  timestamp: Date;
  table: string;
  type: number;
  uuid?: string;
  key: number;
  obj?: string;
  mods?: any;
  mid?: number;
  uid?: number;
  devid?: string;
}

interface SyncIncompleteInventuren {
  jobid: number;
  changes: DBDIClientChangeLog[];
}

export enum SyncJobStatus {
  Init = 0,
  Pending ,
  AlreadyStarted,
  Offline,
  Aborted,
  QueryChangeLogs,
  AbortedEmptyChangeLogs,
  Uploading,
  ServerAnswered,
  ServerAnsweredWithErrors,
  RefreshLogs,
  FinishedWithErrors,
  Finished
}

type statusCallback = (status: SyncJobStatus) => any;

export class SyncJobResult {
  public status: SyncJobStatus = SyncJobStatus.Init;
  public sendClientDeviceId?: number;
  public committed = 0;
  public confirmed = 0;
  public committedIds: number[] = [];
  public confirmedIds: number[] = [];
  public refreshed?: number = null;
  public serverChanges?: SyncServerChangeLog[] = [];
  public unsynced = -1;
  public errorMsg = '';
  public starttime = Date.now();
  public stoptime = 0;
  public alreadyStartedProcess?: SyncJobResult = null;
  public statusChanged = new EventEmitter<SyncJobStatus>();
  public finished = false;

  constructor(public jobid: number) {}

  get duration(): number {
    return (this.stoptime || Date.now()) - this.starttime;
  }

  get durationFormatted(): string {
    const dur = (this.stoptime || Date.now()) - this.starttime;
    const ms = dur % 1000;
    const s = Math.floor(dur / 1000) % 60;
    const m = Math.floor( dur / 60000 ) % 60;
    const h = Math.floor( dur / (60 * 60 * 1000));
    return ((h > 0) ? `${h}h ` : '') +
      ((m > 0) ? `${m}m ` : '') +
      ((s > 0) ? `${s}s ` : '') +
      ((ms > 0) ? `${ms}ms ` : '');
  }

  private statusChangeCallback?: statusCallback;

  public onStatusChange( cb: statusCallback ) {
    this.statusChangeCallback = cb;
  }

  public setStatus(status: SyncJobStatus): SyncJobResult {
    if (status !== this.status) {
      this.status = status;
      this.statusChanged.emit(status);

      if (this.statusChangeCallback) {
        this.statusChangeCallback(this.status);
      }
    }
    return this;
  }

  public getStatus(): SyncJobStatus {
    return this.status;
  }

  public getStatusName(): string {
    return SyncJobStatus[this.status].toString();
  }

  public finish(status: SyncJobStatus, errorMsg?: string): SyncJobResult {
    this.stoptime = Date.now();
    this.finished = true;
    this.status = status;
    if (typeof errorMsg !== 'undefined') {
      this.errorMsg = errorMsg;
    }
    return this;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DBSyncClientService {

  private status: 0;
  private processes: SyncJobResult[] = [];
  private processingJobids: number[] = [];
  public processStarted = new EventEmitter<SyncJobResult>();
  public processFinished = new EventEmitter<SyncJobResult>();

  constructor(
    private dexieService: DexieService,
    private apiService: ApiService,
    private baseData: BasedataService,
    private networkService: ConnectionService,
    private settings: VariablesService) { }

  async sync() {
    const currJobId = this.baseData.getCurrentJobid();
    const incompleteInventurLogs = await this.getIncompleteInventuren();

    const currJobIdx = incompleteInventurLogs.map( itm => itm.jobid ).indexOf( currJobId );

    if (currJobIdx !== -1) {
      const currJob = incompleteInventurLogs[ currJobIdx ];
      incompleteInventurLogs.slice( currJobIdx, 1);
      this.sendByJobId( currJob.jobid, currJob.changes );
    }
    for (const logs of incompleteInventurLogs) {
      this.sendByJobId( logs.jobid, logs.changes );
    }
  }

  async syncJob(jobid: number): Promise<SyncJobResult> {
    console.log('[called syncStart] call this.clearFinishedProcesses');
    this.clearFinishedProcesses();
    console.log('[called syncStart] call this.processes.find(proc => proc.jobid === ' + jobid + ')');
    const currJobProc = this.processes.find( proc => proc.jobid === jobid);
    const newJob = new SyncJobResult(jobid);

    if (currJobProc && !currJobProc.finished) {
      newJob.alreadyStartedProcess = currJobProc;
      console.log('[called syncStart] call newJob.finish(AlreadyStarted)');
      return newJob.finish(SyncJobStatus.AlreadyStarted,
        'Sync-Process is already running. Duration: ' + currJobProc.durationFormatted
      );
    }
    console.log('[called syncStart] call this.numUnsyncedChangeLogsByJobId(' + jobid + ')');
    const numChanges = await this.numUnsyncedChangeLogsByJobId(jobid);
    if (!numChanges) {
      console.log('[called syncStart] call newJob.finish(AbortedEmptyChangeLogs)');
      return newJob.finish(SyncJobStatus.AbortedEmptyChangeLogs);
    }
    console.log('[called syncStart] call this.sendByJobId(' + jobid + ', [], newJob)');
    this.sendByJobId(jobid, [], newJob);
    return newJob;
  }

  private finishProcess(proc: SyncJobResult, status: SyncJobStatus, errorMsg?: string): SyncJobResult {
    if (!proc.finished) {
      proc.finish(status, errorMsg || null);
    }
    this.clearFinishedProcesses();
    this.processFinished.emit( proc );
    return proc;
  }

  async sendByJobId(useJobid: number, useLogs?: DBDIClientChangeLog[], useJobResult?: SyncJobResult): Promise<SyncJobResult> {
    console.log('[called sendByJobId](' + useJobid + ', useLogs, useJobResult)');
    this.clearFinishedProcesses();
    const jobid = useJobid;
    const syncJobResult = useJobResult || new SyncJobResult(jobid);
    const jobInProcess = this.processes.find( proc => proc.jobid === jobid);
    if (jobInProcess && !jobInProcess.finished) {
      syncJobResult.alreadyStartedProcess = jobInProcess;
      return syncJobResult.finish(SyncJobStatus.AlreadyStarted);
    }
    syncJobResult.setStatus( SyncJobStatus.Pending );
    this.processStarted.emit( syncJobResult );

    if (!useLogs || !useLogs.length) {
      syncJobResult.setStatus(SyncJobStatus.QueryChangeLogs );
      useLogs = await this.getUnsyncedChangeLogsByJobId( useJobid );
    }
    if (!useLogs) {
      return this.finishProcess(syncJobResult, SyncJobStatus.AbortedEmptyChangeLogs);
    }
    const logs = useLogs;
    const devid = this.baseData.getCurrentDeviceId() || 0;

    syncJobResult.sendClientDeviceId = devid;
    syncJobResult.committedIds = logs.map<number>( (itm) => itm.id );

    if (!this.networkService.hasInternetAccess) {
      return this.finishProcess(
        syncJobResult,
        SyncJobStatus.Offline,
        'Synchronisatioon wurde abgeborochen wegen fehlernder Serververbindung!'
      );
    }

    console.log('[called sendByJobId] call this.processes.push(syncJobResult)');
    this.processingJobids.push( jobid );
    this.processes.push(syncJobResult);
    const lastDownloads = {
      objektKatalogGlobal: this.settings.get( `objektKatalogGlobal-${jobid}-download-succes`),
      objektKatalogMandant: this.settings.get( `objektKatalogGlobal-${jobid}-download-succes`),
      inventar: this.settings.get( `inventar-${jobid}-download-succes`),
      raeume: this.settings.get( `raeume-${jobid}-download-succes`),
      images: this.settings.get( `images-${jobid}-download-succes`),
      hersteller: this.settings.get( `hersteller-${jobid}-download-succes`),
    };

    syncJobResult.committed = logs.length;
    await this.apiService
      .post<SyncServerResponse>(
      `api/sync/importchanges/${jobid}`,
      {
        jobid,
        devid,
        lastDownloads,
        changes: logs
      })
      .toPromise()
      .then( (data) => {
        if (data.errorMsg) {
          syncJobResult.errorMsg = data.errorMsg;
        }
        console.log('#26 Response of sendByJobId', { data });
        if ('setClientDeviceId' in data && data.setClientDeviceId > 0) {
          this.baseData.setCurrentDevice( data.setClientDeviceId );
        }
        syncJobResult.confirmed = data.syncedLogIds.length;
        syncJobResult.confirmedIds = data.syncedLogIds;
        syncJobResult.unsynced = syncJobResult.committed - syncJobResult.confirmed;
        syncJobResult.serverChanges = data.serverChangeLogs;

        if (data.errorMsg) {
          return syncJobResult.finish( SyncJobStatus.ServerAnsweredWithErrors, data.errorMsg );
        } else {
          return syncJobResult.setStatus( SyncJobStatus.ServerAnswered );
        }
      })
      .catch( (reason) => {
        syncJobResult.finish( SyncJobStatus.Aborted,  JSON.stringify( reason ));
      });

    if (syncJobResult.getStatus() !== SyncJobStatus.ServerAnswered) {
      return this.finishProcess(syncJobResult, syncJobResult.getStatus(), syncJobResult.errorMsg);
    }

    syncJobResult.refreshed = await this.processResponseByJobId(syncJobResult.confirmedIds, syncJobResult.jobid);
    this.updateCommitCounter(syncJobResult.committedIds, syncJobResult.jobid);

    const diff = syncJobResult.committed - syncJobResult.refreshed;
    if ( diff !== 0 ) {
      syncJobResult.errorMsg += `Von ${diff} ChangeLog-Einträgen konte der Status nach der Synchronisierung nicht aktualisert werden!`;
    }

    if (syncJobResult.errorMsg) {
      return this.finishProcess(syncJobResult, SyncJobStatus.FinishedWithErrors, syncJobResult.errorMsg);
    } else {
      return this.finishProcess(syncJobResult, SyncJobStatus.Finished );
    }
  }

  public clearFinishedProcesses() {
    this.processes = this.processes.filter( proc => !proc.finished );
    this.processingJobids = this.processes.map<number>( proc => proc.jobid );
  }

  public getRunningProcesses(): SyncJobResult[] {
    this.clearFinishedProcesses();
    return this.processes;
  }

  public getProcessByJobId(jobid: number): SyncJobResult {
    return this.processes.find( proc => proc.jobid === jobid);
  }

  private async updateCommitCounter(committedIds: number[], jobid?: number): Promise<number> {
    return await this.dexieService.clientChangeLog
      .where('id')
      .anyOf( committedIds )
      .and((log) => !jobid || log.jobid === jobid)
      .modify((log) => {
        log.sync_attempts++;
        log.sync_lastattempt = new Date();
      });
  }

  private async processResponseByJobId(syncedLogIds: number[], jobid?: number): Promise<number> {
    // Return Anzahl betroffener Datensätze
    const syncTime = Date.now();
    return await this.dexieService.clientChangeLog
      .where('id')
      .anyOf(syncedLogIds)
      .and((log) => !jobid || log.jobid === jobid)
      .modify({
        sync_done: 1,
        sync_time: syncTime
      });
  }

  public async getUnsyncedChangeLogsByJobId(jobid: number): Promise<DBDIClientChangeLog[]> {
    return await this.dexieService.clientChangeLog
      .where({ jobid })
      .filter(itm => !('sync_done' in itm) || itm.sync_done === 0)
      .toArray();
  }

  public async numUnsyncedChangeLogsByJobId(jobid: number): Promise<number> {
    const rslt = this.dexieService.clientChangeLog
      .where('jobid' )
      .equals( jobid )
      // .filter(itm => !('sync_done' in itm) || itm.sync_done === 0)
      .count();

    rslt.then( num => {
      console.log('then numUnsyncedChangeLogsByJobId: ', { jobid, num });
      return num;
    }).catch( err => {
      console.error('then numUnsyncedChangeLogsByJobId: ', { jobid, err } );
    });
    return rslt;
  }

  private async getIncompleteInventuren(): Promise<SyncIncompleteInventuren[]> {
    const numPending = await this.dexieService.clientChangeLog.where({ sync_done: 0 }).count();
    return this.dexieService.clientChangeLog
      .where({ sync_done: 0 })
      .toArray()
      .then( list => {
        const currJobId = this.baseData.getCurrentJobid();
        const listGroupedByJobid: SyncIncompleteInventuren[] = [];

        listGroupedByJobid.push({
          jobid: currJobId,
          changes: []
        });
        const groupIds: number[] = [ currJobId ];

        list.forEach( item => {
          const jobid = item.jobid;
          let groupIdx = groupIds.indexOf( jobid );
          if (groupIdx === -1) {
            groupIds.push( jobid );
            listGroupedByJobid.push({
              jobid,
              changes: []
            });
            groupIdx = groupIds.indexOf( jobid );
          }
          listGroupedByJobid[ groupIdx ].changes.push( item );
        });

        return listGroupedByJobid;
      });
  }
}
