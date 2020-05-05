import { Injectable } from '@angular/core';
import {ApiService} from './api.service';
import {BasedataService} from './basedata.service';
import {DBDIClientChangeLog, DBDIInventuren, DexieService} from './dexie.service';
import {ConnectionService} from './connection-service.service';

interface SyncServerResponse {
  YourData?: {
    jobid?: number,
    params?: object
  };
  success: boolean;
  errorMsg?: string;
  syncedLogIds: number[];
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

enum SyncJobStatus {
  Init = 0,
  Pending = 1,
  AlreadyStarted = 2,
  Offline = 3,
  Aborted = 4,
  Uploading = 5,
  ServerAnswered = 6,
  ServerAnsweredWithErrors = 7,
  RefreshLogs = 8,
  FinishedWithErrors = 9,
  Finished = 10
}

interface SyncJobResult {
  status: SyncJobStatus;
  jobid: number;
  committed: number;
  confirmed: number;
  committedIds: number[];
  confirmedIds: number[];
  refreshed?: number;
  serverChanges?: SyncServerChangeLog[];
  unsynced?: number;
  errorMsg?: string;
  starttime?: Date;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DBSyncClientService {

  private status: 0;
  private processes: any[];
  private processingJobids: number[];

  constructor(
    private dexieService: DexieService,
    private apiService: ApiService,
    private baseData: BasedataService,
    private networkService: ConnectionService) { }

  async sync() {
    const currJobId = this.baseData.getCurrentJobid();
    const incompleteInventurLogs = await this.getIncompleteInventuren();

    const currJobIdx = incompleteInventurLogs.map( itm => itm.jobid ).indexOf( currJobId );
    if (currJobIdx !== -1) {
      const currJob = incompleteInventurLogs[ currJobIdx ];
      incompleteInventurLogs.slice( currJobIdx, 1);
      this.sendByJobId( currJob );
    }
    for (const logs of incompleteInventurLogs) {
      this.sendByJobId( logs );
    }
  }

  async sendByJobId(logs: SyncIncompleteInventuren): Promise<SyncJobResult> {
    const syncJobResult: SyncJobResult = {
      status: SyncJobStatus.Pending,
      jobid: logs.jobid,
      committed: 0,
      committedIds: logs.changes.map<number>( (itm) => itm.id ),
      confirmed: 0,
      confirmedIds: [],
      refreshed: 0,
      unsynced: -1,
      errorMsg: '',
      starttime: new Date(),
      duration: 0
    };

    if (this.processingJobids.indexOf( logs.jobid ) !== -1) {
      return { ...syncJobResult, ...{  status: SyncJobStatus.AlreadyStarted} };
    }

    if (!this.networkService.hasInternetAccess) {
      return { ...syncJobResult, ...{  status: SyncJobStatus.Offline } };
    }

    this.processingJobids.push( logs.jobid );

    syncJobResult.committed = logs.changes.length;

    const jobid = logs.jobid;
    const devid = this.baseData.getCurrentDeviceId() || 0;
    await this.apiService.post<SyncServerResponse>(
      `/api/sync/importchanges/${jobid}`,
      {
        jobid,
        devid,
        changes: logs.changes
      })
      .toPromise()
      .then( (data) => {
        console.log('#26 Response of sendByJobId', { data });
        if (data.errorMsg) {
          syncJobResult.errorMsg = data.errorMsg;
          syncJobResult.status = SyncJobStatus.ServerAnsweredWithErrors;
        } else {
          syncJobResult.status = SyncJobStatus.ServerAnswered;
        }
        syncJobResult.confirmed = data.syncedLogIds.length;
        syncJobResult.confirmedIds = data.syncedLogIds;
        syncJobResult.unsynced = syncJobResult.committed - syncJobResult.confirmed;
        syncJobResult.serverChanges = data.serverChangeLogs;
        return syncJobResult;
      }).catch( (reason) => {
        syncJobResult.status = SyncJobStatus.Aborted;
        syncJobResult.errorMsg = JSON.stringify( reason );
      });

    syncJobResult.refreshed = await this.processResponseByJobId(syncJobResult.confirmedIds, syncJobResult.jobid);
    this.updateCommitCounter(syncJobResult.committedIds, syncJobResult.jobid);
    syncJobResult.duration = (new Date()).getTime() - syncJobResult.starttime.getTime();
    const diff = syncJobResult.committed - syncJobResult.refreshed;
    if ( diff !== 0 ) {
      syncJobResult.errorMsg += `Von ${diff} ChangeLog-Einträgen konte der Status nach der Synchronisierung nicht aktualisert werden!`;
    }

    if (syncJobResult.errorMsg) {
      syncJobResult.status = SyncJobStatus.FinishedWithErrors;
    } else {
      syncJobResult.status = SyncJobStatus.Finished;
    }

    return syncJobResult;
  }

  async updateCommitCounter(committedIds: number[], jobid?: number): Promise<number> {
    return await this.dexieService.clientChangeLog
      .where('id')
      .anyOf( committedIds )
      .and((log) => !jobid || log.jobid === jobid)
      .modify((log) => {
        log.sync_attempts++;
        log.sync_lastattempt = new Date();
      });
  }

  async processResponseByJobId(syncedLogIds: number[], jobid?: number): Promise<number> {
    // Return Anzahl betroffener Datensätze
    return await this.dexieService.clientChangeLog
      .where('id')
      .anyOf(syncedLogIds)
      .and((log) => !jobid || log.jobid === jobid)
      .modify({
        sync_done: 1,
        sync_time: new Date()
      });
  }

  async getIncompleteInventuren(): Promise<SyncIncompleteInventuren[]> {
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
