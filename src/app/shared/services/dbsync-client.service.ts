import {EventEmitter, Injectable, OnDestroy, Output} from '@angular/core';
import {ApiService} from './api.service';
import {BasedataService} from './basedata.service';
import {DexieService} from './dexie.service';
import {DBDIBarcodeLookup, DBDIClientChangeLog, DBDIServerSyncErrors} from '../interfaces/dexie.interfaces';
import {ConnectionService} from './connection-service.service';
import {VariablesService} from './variables.service';
import {DbsyncLogService, TableSyncProgress} from './dbsync-log.service';
import {DatabaseChangeType} from 'dexie-observable/api';
import {Subscription} from 'rxjs';
import {BarcodeService} from "../../pages/invent-form/data-services/barcode.service";

export interface TableSyncProgressList {
  [key: string]: TableSyncProgress;
}

interface SyncServerChangeRevisionLog {
  revision_id: number;
  jobid?: number;
  timestamp: Date;
  table: string;
  type: number;
  uuid?: string;
  key: number;
  id: number;
  obj?: string;
  mods?: any;
  mid?: number;
  uid?: number;
  devid?: string;
}
interface SyncServerReChanges {
  table: string;
  uuid: string;
  mods: any;
}
interface SyncServerTableChangeLog {
  inserts?: [];
  updates?: [];
}
interface SyncServerChangeLog {
  [key: string ]: SyncServerTableChangeLog;
}
export interface SyncServerError {
  clientChangeLogId: number;
  table: string;
  type?: number;
  uuid: string;
  ERROR_CODE: string;
  ERROR_MSG: string;
  ERROR_DATA?: any;
  ERROR_REF_TABLE?: string;
  ERROR_REF_BY?: string;
  ERROR_REF_UUID?: string;
}

export interface SyncServerErrorEvent {
  jobid: number;
  startDate: Date;
  errors: SyncServerError[];
}

export interface SyncServerErrorChange {
  jobid: number;
  count: number;
}

interface SyncMappedIds {
  hersteller?: {[key: string]: number }[];
  objektKatalogGlobal?: {[key: string]: number }[];
  objektKatalogMandant?: {[key: string]: number }[];
  objektKatalogImages?: {[key: string]: number }[];
  raeume?: {[key: string]: number }[];
  inventar?: {[key: string]: number }[];
  images?: {[key: string]: number }[];
}

interface SyncServerChangeNextChunk {
  numRows: number;
  size: number;
  firstRevisionId: number;
  lastRevisionId: number;
}

interface SyncServerChanges {
  total: number;
  rows: SyncServerChangeRevisionLog[];
  chunkSize: number;
  firstRevisionId: number;
  lastRevisionId: number;
}

interface SyncServerResponse {
  success: boolean;
  jobid: number;
  errorMsg?: string;
  setClientDeviceId?: number;
  syncedLogIds: number[];
  aSyncedChangeIds: number[];
  aSyncErrors: SyncServerError[];
  aFailedChangeIds: { id: number, reason: string}[];
  // serverChanges: SyncServerChangeRevisionLog[];
  serverRechanges: SyncServerReChanges[];
  iNumImports?: number;
  syncMappedIds?: SyncMappedIds;
  serverChangeLogs?: SyncServerChangeLog;
  revisionId: number;

  serverChanges: {
    total: number;
    rows: SyncServerChangeRevisionLog[];
    chunkSize: number;
    firstRevisionId: number;
    lastRevisionId: number;
  };
}

export interface ServerChangesStatusInfo {
  success?: boolean;
  MaxRevisionId: number;
  NumChanges: number;
  errorMsg?: string;
}

interface ServerChangesStatusInfoCache {
  jobid: number;
  timestamp: number;
  data: ServerChangesStatusInfo;
}

interface SyncIncompleteInventuren {
  jobid: number;
  changes: DBDIClientChangeLog[];
}

interface CurrentJobSyncStatus {
  jobid: number;
  unsyncedClientLogs: number;
  serverRevisionId: number;
  clientRevisionId: number;
  isRunning: boolean;
  isUploading: boolean;
  jobStatus: SyncJobStatus;
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
  WriteServerSyncedIds,
  WriteServerReChanges,
  WriteServerChanges,
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
  public serverChanges?: SyncServerChangeLog = {};
  public unsynced = -1;
  public errorMsg = '';
  public starttime = Date.now();
  public stoptime = 0;
  public alreadyStartedProcess?: SyncJobResult = null;
  public statusChanged = new EventEmitter<SyncJobStatus>();
  public finished = false;

  public revisionId?: number;
  public synced?: number;
  public conflicts?: number;
  public numServerRechanges?: number;
  public numServerChanges?: number;

  constructor(
    public jobid: number) {}

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
    this.setStatus( status );
    if (typeof errorMsg !== 'undefined') {
      this.errorMsg = errorMsg;
    }
    return this;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DBSyncClientService implements OnDestroy {

  private status: 0;
  private processes: SyncJobResult[] = [];
  private processingJobids: number[] = [];
  public processStarted = new EventEmitter<SyncJobResult>();
  public processFinished = new EventEmitter<SyncJobResult>();
  private syncIntervalTimer = null;
  private fullImportJobid = 0;
  private currentJobSyncStatus: CurrentJobSyncStatus;
  private subscriptionClientLogsChanged: Subscription;
  private subscriptionNetworkChanged: Subscription;
  private aLastServerChangesByJobid: ServerChangesStatusInfoCache[] = [];
  private serverChangesCacheLifetime = 60 * 1000;
  private isInDebugMode = false;

  @Output() autoSyncChange = new EventEmitter<boolean>();
  @Output() updateStatusChanges = new EventEmitter<any>();
  @Output() currentJobChange = new EventEmitter<CurrentJobSyncStatus>();
  @Output() syncErrorChange = new EventEmitter<SyncServerErrorChange>();

  constructor(
    private dexieService: DexieService,
    private apiService: ApiService,
    private baseData: BasedataService,
    private networkService: ConnectionService,
    private settings: VariablesService,
    private dbSyncLogService: DbsyncLogService,
    private bcLookupService: BarcodeService) {

    this.subscriptionClientLogsChanged = this.dexieService.clientSyncAmountChanged.subscribe( (amount) => {
      if (this.isInDebugMode) {
        console.log('DBSyncClientService.constructor() subscribedEvent #271 clientSyncAmountChanged: ', { amount });
      }
    });
    this.subscriptionNetworkChanged = this.networkService.monitor().subscribe( (state) => {
      if (this.isInDebugMode) {
        console.log('DBSyncClientService.constructor() connectionChanged #275', { state });
      }
      if (state.hasServerAccess) {
        this.autoSyncStart(true);
      } else {
        this.autoSyncStop();
      }
    });
    if (this.networkService.getCurrentState().hasServerAccess) {
      this.autoSyncStart();
    }
  }

  ngOnDestroy() {
    this.subscriptionClientLogsChanged.unsubscribe();
  }

  initCurrentJobSyncStatus() {
    this.currentJobSyncStatus = {
      jobid: 0,
      unsyncedClientLogs: 0,
      serverRevisionId: 0,
      clientRevisionId: 0,
      isUploading: false,
      isRunning: false,
      jobStatus: SyncJobStatus.Init
    };
  }

  autoSyncIsRunning() {
    return this.syncIntervalTimer !== null;
  }

  setFullImportJobiId(jobid: number) {
    this.fullImportJobid = jobid;
  }

  getFullImportJobId(): number {
    return this.fullImportJobid;
  }

  autoSyncStart(startNow: boolean = false) {
    if (this.syncIntervalTimer) {
      this.autoSyncStop();
    }

    // Sync im 1-Minuten-Takt
    this.syncIntervalTimer = setInterval( this.sync.bind(this), 1 * 60 * 1000);
    this.autoSyncChange.emit( true );

    if (startNow) {
      this.sync();
    }
  }

  autoSyncStop() {
    if (this.syncIntervalTimer) {
      try {
        clearInterval(this.syncIntervalTimer);
        this.syncIntervalTimer = null;
        this.autoSyncChange.emit( false );
      } catch (e) {}
    }
  }

  async sync() {
    if (!this.networkService.getCurrentState().hasServerAccess) {
      return;
    }
    const isDBSyncService = (this instanceof DBSyncClientService);
    if (this.isInDebugMode) {
      console.log('DBSyncClientService.sync() #358 this is DBSyncClientService', { isDBSyncService });
    }
    if (!isDBSyncService) {
      console.error('DBSyncClientService.sync() #361 this is not correct binded to Instance of DBSyncClientService');
      return;
    }

    const currJobId = this.baseData.getCurrentJobid();
    console.log('DBSyncClientService.sync() #366 currJobId:', currJobId);
    if (this.isInDebugMode) {
      console.log('DBSyncClientService.sync() #368 call getIncompleteInventuren()');
    }
    const incompleteInventurLogs = await this.getIncompleteInventuren();

    const currJobIdx = incompleteInventurLogs.map( itm => itm.jobid ).indexOf( currJobId );
    if (this.isInDebugMode) {
      console.log('DBSyncClientService.sync() #374 currJobIdx: ', currJobIdx);
    }

    if (currJobIdx !== -1) {
      if (this.isInDebugMode) {
        console.log('DBSyncClientService.sync() #379');
      }
      const currJob = incompleteInventurLogs[ currJobIdx ];
      incompleteInventurLogs.slice( currJobIdx, 1);
      if (this.isInDebugMode) {
        console.log('DBSyncClientService.sync() #384 call sendByJobId(', currJob.jobid, currJob.changes, ')');
      }
      await this.sendByJobId( currJob.jobid, currJob.changes);
    }

    for (const logs of incompleteInventurLogs) {
      if (this.isInDebugMode) {
        console.log('DBSyncClientService.sync() #391 call sendByJobId(', logs.jobid, logs.changes, ')');
      }
      await this.sendByJobId( logs.jobid, logs.changes );
    }

    console.log('DBSyncClientService.sync() # 395 END');
  }

  async getCurrentClientRevId(): Promise<number> {
    const jobid = this.baseData.getCurrentJobid();
    return this.getClientRevIdByJobid( jobid );
  }

  async getClientRevIdByJobid(jobid: number): Promise<number> {
    const lastRevIdVar = `jobid-${jobid}-revision-id`;
    return await this.settings.get( lastRevIdVar) || 0;
  }

  async setCurrentClientRevId(newRevId: number): Promise<boolean> {
    console.log(`DBSyncClientService.setCurrentClientRevId(newRevId: ${newRevId}) #410`);
    const jobid = this.baseData.getCurrentJobid();
    const lastRevIdVar = `jobid-${jobid}-revision-id`;
    return await this.settings.setRevId( lastRevIdVar, newRevId, 'dbsync-client.service.ts setCurrentClientRevId');
  }

  async askServerForChanges(jobid: number = 0): Promise<ServerChangesStatusInfo> {
    if (!jobid) {
      jobid = this.baseData.getCurrentJobid();
    }
    const devid = this.baseData.getCurrentDeviceId() || 0;
    const lastRevId = await this.getClientRevIdByJobid(jobid);

    if (!this.networkService.hasServerAccess) {
      console.error('Abort Change-Request: No Internet!');
      return { success: false, errorMsg: 'Abort Change-Request: No Internet!', MaxRevisionId: -1, NumChanges: -1 };
    }

    return this.apiService
      .get<any>(
        `api/sync/havingChanges/${jobid}/${lastRevId}/${devid}`,
        {})
      .toPromise()
      .then(async (data) => {
        if ( ('errorMsg' in data) && data.errorMsg) {
          console.error( data.errorMsg );
          return { success: false };
        }
        return { ...{ success: true}, ...data};
      });
  }

  async refreshServerChangeCache(jobid, timestamp, data): Promise<void> {
    const sc = this.aLastServerChangesByJobid.find( ch => ch.jobid === jobid);
    if (sc) {
      sc.timestamp = Date.now();
      sc.data = data;
    } else {
      this.aLastServerChangesByJobid.unshift({
        jobid,
        timestamp: Date.now(),
        data
      });
    }
  }

  async getLastServerChanges(jobid: number = 0, maxAge = 60 * 10 * 1000): Promise<ServerChangesStatusInfo> {
    const sc = this.aLastServerChangesByJobid.find( ch => ch.jobid === jobid);
    if (!sc || Date.now() - sc.timestamp > maxAge) {
      return this.askServerForChanges(jobid);
    }
    return sc.data;
  }

  async syncJob(jobid: number): Promise<SyncJobResult> {
    console.log('DBSyncClientService.syncJob(jobid:', jobid, ') #404');
    this.clearFinishedProcesses();

    const currJobProc = this.processes.find( proc => proc.jobid === jobid);
    const newJob = new SyncJobResult(jobid);

    if (currJobProc && !currJobProc.finished) {
      console.log('DBSyncClientService.syncJob() #411. Sync für Job ', jobid, ' läuft bereits!');
      newJob.alreadyStartedProcess = currJobProc;
      return newJob.finish(SyncJobStatus.AlreadyStarted,
        'Sync-Process is already running. Duration: ' + currJobProc.durationFormatted
      );
    }

    const numChanges = await this.numUnsyncedChangeLogsByJobId(jobid);
    if (!numChanges && this.isInDebugMode) {
      console.log('DBSyncClientService.syncJob() #420. numClientChanges: ' + numChanges);
      // return newJob.finish(SyncJobStatus.AbortedEmptyChangeLogs);
    }

    if (this.isInDebugMode) {
      console.log('DBSyncClientService.syncJob() #424. call this.sendByJobId(' + jobid + ', [], newJob)');
    }
    this.sendByJobId(jobid, [], newJob);
    return newJob;
  }

  private async finishProcess(proc: SyncJobResult, status: SyncJobStatus, errorMsg?: string): Promise<SyncJobResult> {
    if (!proc.finished) {
      proc.finish(status, errorMsg || null);
    }
    this.clearFinishedProcesses();
    this.processFinished.emit( proc );
    await this.bcLookupService.rebuildOnRunningSystemByJobid(proc.jobid);
    return proc;
  }

  async sendByJobId(useJobid: number, useLogs?: DBDIClientChangeLog[], useJobResult?: SyncJobResult): Promise<SyncJobResult> {
    console.log('DBSyncClientService.sendByJobId(useJobid:', useJobid, 'useLogs: ', typeof useJobResult, ') #440');
    this.clearFinishedProcesses();
    const jobid = useJobid;
    const syncJobResult = useJobResult || new SyncJobResult(jobid);

    if (this.getFullImportJobId() === useJobid ) {
      return this.finishProcess(
        syncJobResult,
        SyncJobStatus.AlreadyStarted,
        'Synchronisation wurde abgebrochen, da Import noch läuft!'
      );
    }

    if (!this.networkService.hasServerAccess) {
      return this.finishProcess(
        syncJobResult,
        SyncJobStatus.Offline,
        'Synchronisatioon wurde abgebrochen wegen fehlender Serververbindung!'
      );
    }

    if (this.isInDebugMode) {
      console.log(`DbsyncClientServer.sendByJobId(${jobid}) #525 call askServerForChanges`, (new Date()).toString());
    }
    const ServerInfo = await this.askServerForChanges();

    const devid = this.baseData.getCurrentDeviceId() || 0;
    const lastRevIdVar = `jobid-${jobid}-revision-id`;

    let lastRevId = (await this.settings.get(lastRevIdVar)) || 0;
    const jobInProcess = this.processes.find(proc => proc.jobid === jobid);

    if (jobInProcess && !jobInProcess.finished) {
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.sendByJobId(${jobid}) #537. Abbruch. Sync läuft bereits`);
      }
      syncJobResult.alreadyStartedProcess = jobInProcess;
      return syncJobResult.finish(SyncJobStatus.AlreadyStarted);
    }

    syncJobResult.setStatus(SyncJobStatus.Pending);
    this.processStarted.emit(syncJobResult);

    if (!useLogs || !useLogs.length) {
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.sendByJobId(${jobid}) #548. Keine Client-Änderungen!`);
      }
      syncJobResult.setStatus(SyncJobStatus.QueryChangeLogs);
      useLogs = await this.getUnsyncedChangeLogsByJobId(useJobid);
    }

    if (!useLogs && !ServerInfo.NumChanges) {
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.sendByJobId(${jobid}) #556; Abbruch. Keine Änderungen!`);
      }
      return this.finishProcess(syncJobResult, SyncJobStatus.AbortedEmptyChangeLogs);
    }
    let logs = useLogs;

    syncJobResult.sendClientDeviceId = devid;
    syncJobResult.committedIds = logs.map<number>((itm) => itm.id);

    // ASK for Server-Changes
    if (this.isInDebugMode) {
      console.log(`DBSyncClientService.sendByJobId(${jobid}) #567`);
    }
    this.processingJobids.push(jobid);
    this.processes.push(syncJobResult);

    this.dbSyncLogService.start(jobid, lastRevId);
    const syncLogMsg = this.dbSyncLogService.message.bind(this.dbSyncLogService, [jobid]);
    const syncLogErr = this.dbSyncLogService.error.bind(this.dbSyncLogService, [jobid]);
    const syncLogData = this.dbSyncLogService.log.bind(this.dbSyncLogService);

    syncLogMsg('Starte Synchronisation');
    let total = 0;
    let executed = 0;
    let chunks = 0;
    let lastSyncDate: Date;
    const tableLogs: TableSyncProgressList = {};

    let syncJobLoop = 0;
    while (!syncJobResult.finished && syncJobLoop < 20) {
      syncJobLoop++;
      if (syncJobLoop > 1) {
        lastRevId = (await this.settings.get(lastRevIdVar)) || 0;
        logs = await this.getUnsyncedChangeLogsByJobId(useJobid);
      }
      if (lastRevIdVar === 'jobid-2-revision-id' && lastRevId === 0 ) {
        const err = 'Fehlerhafter Wert für ' + name + ': ' + lastRevId;
        console.error( err );
        alert( err );
        return;
      }
      if (this.isInDebugMode) {
        console.log(
          `DBSyncClientService.sendByJobId(${jobid}) #599. Synchronisations-Loop!`,
          { syncJobLoop, lastRevId, 'logs.length': logs.length }
        );
      }

      syncLogMsg('Download Daten ...');
      syncJobResult.committed = logs.length;
      lastSyncDate = new Date();
      await this.apiService
        .post<SyncServerResponse>(
          `api/sync/syncWithRevisionId/${jobid}`,
          {
            jobid,
            devid,
            lastRevId,
            changes: logs
          })
        .toPromise()
        .then(async (data) => {
          chunks++;
          if (('errorMsg' in data) && data.errorMsg) {
            syncJobResult.errorMsg = data.errorMsg;
            console.error(`DBSyncClientService.sendByJobId(${jobid}) #621 ${data.errorMsg}`);
            syncLogErr('Download Fehler: ' + data.errorMsg);
            return this.finishProcess(syncJobResult, SyncJobStatus.ServerAnsweredWithErrors);
          }

          this.saveLastSyncErrorEvent({
            jobid,
            startDate: lastSyncDate,
            errors: data.aSyncErrors || []
          });

          if (total === 0) {
            total = data.serverChanges.total;
            this.dbSyncLogService.jobSetTotal(jobid, total);
          }
          this.dbSyncLogService.jobSetChunks(jobid, chunks);

          syncLogMsg('Verarbeite Server-Antwort ...');
          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #640 Changes wurden gesendet, verarbeite Response`, {
              aSyncedChangeIds: data.aSyncedChangeIds ? data.aSyncedChangeIds.length : 0,
              aFailedChangeIds: data.aFailedChangeIds ? data.aFailedChangeIds.length : 0,
              serverRechanges: data.serverRechanges ? data.serverRechanges.length : 0,
              serverChanges: data.serverChanges.rows ? data.serverChanges.rows.length : 0
            });
          }

          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #649 Process sync_done`);
          }
          if (data.aSyncedChangeIds && data.aSyncedChangeIds.length > 0) {
            syncLogMsg('Entferne vom Server bestätige Client-Logs ...');
            syncJobResult.setStatus(SyncJobStatus.WriteServerSyncedIds);
            await this.dexieService.clientChangeLog
              .where('id')
              .anyOf(data.aSyncedChangeIds)
              .modify({sync_done: 1});

            await this.dexieService.clientChangeLog
              .where({sync_done: 1})
              .delete();
          }

          if (data.aFailedChangeIds && data.aFailedChangeIds.length > 0) {
            syncJobResult.errorMsg += 'Num Failed Server-Syncs: ' + data.aFailedChangeIds.length + '.\n';
            for (const chckFailure of data.aFailedChangeIds) {
              switch (chckFailure.reason) {
                case 'INSERT_ALREADY_EXISTS':
                case 'NEWER_VERSION_ON_SERVER':
                  await this.dexieService.clientChangeLog.delete(chckFailure.id);
                  break;
              }
            }
          }

          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #677. Process serverRechanges`);
          }
          if (data.serverRechanges && data.serverRechanges.length > 0) {
            syncLogMsg('Korrigiere Client-Ids nach Server-Antwort ...');
            syncJobResult.setStatus(SyncJobStatus.WriteServerReChanges);
            await Promise.all(data.serverRechanges.map(async (chg) => {
              chg.table = chg.table[0].toLowerCase() + chg.table.substr(1);
              chg.mods.log = false;
              return this.dexieService.table(chg.table).where({uuid: chg.uuid}).modify(chg.mods);
            }));
          }

          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #690. Process serverChanges`);
          }

          if (data.serverChanges.rows && data.serverChanges.rows.length > 0) {
            syncLogMsg('Import Server-Changes ...');
            syncJobResult.setStatus(SyncJobStatus.WriteServerChanges);
            const chgLen = data.serverChanges.rows.length;
            for (let ci = 0; ci < chgLen; ci++) {
              const chg = data.serverChanges.rows[ci];
              const currRevId = chg.revision_id;
              if (currRevId < lastRevId) {
                const err = `#701 SYNC-FEHLER: LastRevId ist größer als CurrRevID: ${lastRevId} > ${currRevId}`;
                console.error(`DBSyncClientService.sendByJobId(${jobid}) #702 ${err}`);
                return this.finishProcess(syncJobResult, SyncJobStatus.Aborted,
                  'Server-Aenderungen sind nicht streng nach RevId sortiert!');
              }

              chg.table = chg.table[0].toLowerCase() + chg.table.substr(1);
              if (!(chg.table in tableLogs) ) {
                tableLogs[chg.table] = {
                  jobid,
                  table: chg.table,
                  revisionId: chg.revision_id,
                  executed: 0,
                  puts: 0,
                  modified: 0,
                  deleted: 0,
                  total: 0,
                  lastEmittedrevisionId: 0
                };
              }

              switch (chg.type) {
                case 1: // Insert
                  tableLogs[chg.table].puts++;
                  const objInsertData = { ...(JSON.parse(chg.obj)), ...{ log: false }};
                  if (this.isInDebugMode) {
                    console.log(`DBSyncClientService.sendByJobId(${jobid})) INSERT 727 ${ci}/${chgLen}` +
                      ' dbsync-client.service. await this.dexieService.table( ' + chg.table + ' ).put( objInsertData )', objInsertData);
                  }
                  await this.dexieService.table(chg.table).put(objInsertData);
                  break;

                case 2: // Update
                  tableLogs[chg.table].modified++;
                  const objUpdateData = { ...(JSON.parse(chg.mods)), ...{ log: false }};
                  if (this.isInDebugMode) {
                    console.log(`DBSyncClientService.sendByJobId(${jobid}) UPDATE #737. ${ci}/${chgLen}` +
                      ' this.dexieService.table( ' + chg.table + ' )' +
                      '.where({uuid:' + chg.uuid + '}).modify( objUpdateData )', chg);
                  }
                  await this.dexieService.table(chg.table)
                    .where({uuid: chg.uuid})
                    .modify(objUpdateData);
                  break;

                case 3: // Delete
                  tableLogs[chg.table].deleted++;
                  if (this.isInDebugMode) {
                    console.log(`DBSyncClientService.sendByJobId(${jobid}) DELETE #749 ${ci}/${chgLen}` +
                      ' table ' + chg.table + ' by uuid ' + chg.uuid );
                  }
                  await this.dexieService.table(chg.table)
                    .where({uuid: chg.uuid})
                    .delete();
              }

              executed++;
              tableLogs[chg.table].executed++;
              lastRevId = currRevId;
              if (this.isInDebugMode) {
                console.log(`DBSyncClientService.sendByJobId(${jobid}) DELETE #761` +
                  `settings.setRevId(${lastRevIdVar}, ${chg.revision_id}`, `LogRow ${ci}/${chgLen}; RevId ${currRevId})`);
              }
              await this.settings.setRevId(lastRevIdVar, chg.revision_id, `LogRow ${ci}/${chgLen}; RevId ${currRevId})`);

              if (executed === total || executed % 100 === 0) {
                for (const logData of Object.values(tableLogs)) {
                  if (logData.revisionId > logData.lastEmittedrevisionId) {
                    syncLogData(logData);
                    logData.lastEmittedrevisionId = logData.revisionId;
                  }
                }
              }
            }
          }

          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #778. Process SyncResponse finished`);
          }
          syncJobResult.revisionId = await this.settings.get(lastRevIdVar);
          syncJobResult.committed = logs ? logs.length : 0;
          syncJobResult.synced = data.aSyncedChangeIds ? data.aSyncedChangeIds.length : 0;
          syncJobResult.conflicts = data.aFailedChangeIds ? data.aFailedChangeIds.length : 0;
          syncJobResult.numServerRechanges = data.serverRechanges ? data.serverRechanges.length : 0;
          syncJobResult.numServerChanges = data.serverChanges ? data.serverChanges.rows.length : 0;

          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #788. data.serverChanges.total:`, data.serverChanges.total);
          }

          for (const logData of Object.values(tableLogs)) {
            syncLogData(logData);
            logData.lastEmittedrevisionId = logData.revisionId;
          }

          if (data.serverChanges.rows.length < data.serverChanges.total) {
            if (this.isInDebugMode) {
              console.log(`DBSyncClientService.sendByJobId(${jobid}) #798. Keep SyncProcess open`);
            }
            return syncJobResult;
          }
          if (this.isInDebugMode) {
            console.log(`DBSyncClientService.sendByJobId(${jobid}) #803. Finish SyncProcess`);
          }
          syncLogMsg('Aktuelle Synchronisation wurde abgeschlossen');
          return this.finishProcess(syncJobResult, SyncJobStatus.Finished);
        }
      );
    }
    console.log(`DBSyncClientService.sendByJobId(${jobid}) #810 FINISHED. tableLogs: `, tableLogs);
  }

  async addBarcodeToLookupTable(
    code: DBDIBarcodeLookup['code'],
    table: DBDIBarcodeLookup['table'],
    uuid: DBDIBarcodeLookup['uuid'],
    forJobid: DBDIBarcodeLookup['for_jobid'],
    id?: DBDIBarcodeLookup['id']): Promise<boolean> {

    const tblBarcodeLookup = this.dexieService.barcodeLookup;
    const updateHelper = 1;
    const key = this.dexieService.table( table ).schema.primKey.keyPath as string;

    tblBarcodeLookup.put({...{
      code,
      table,
      key,
      id,
      for_jobid: forJobid,
      uuid,
      updateHelper
    }, ...{log: false}});
    return true;
  }

  public clearFinishedProcesses() {
    this.processes = this.processes.filter(p => !p.finished );
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
        return log;
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
    const db = this.dexieService;

    return db.clientChangeLog
      .where({ jobid })
      .filter(itm => !('sync_done' in itm) || itm.sync_done === 0)
      .toArray()
      .then( (list) => {
        return this.sortAndFixChangeLogs(list);
      });
  }

  public sortAndFixChangeLogs(list: DBDIClientChangeLog[]): Promise<DBDIClientChangeLog[]> {
    if (this.isInDebugMode) {
      console.log('DbSyncClientService.sortAndFixChangeLogs(list(length):', list.length, ') #889');
    }
    const tablePrio = [ 'inventar', 'objektKatalogMandant', 'objektKatalogGlobal', 'hersteller' ];
    const db = this.dexieService;

    list.sort( (a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp < b.timestamp ? -1 : 1;
      } else {
        return (tablePrio.indexOf(a.table) > tablePrio.indexOf(b.table)) ? -1 : 1;
      }
    });

    return Promise.all(list.map( async (itm) => {
      if (itm.type === DatabaseChangeType.Update) {
        if (Object.keys(itm.mods).length === 0 || (Object.keys(itm.mods).length === 1 && 'modified_at' in itm.mods)) {
          console.log('DbSyncClientService.sortAndFixChangeLogs() #905 Removing empty Entry from Change-Log', { itm });
          db.clientChangeLog.delete(itm.id);
          return null;
        }
      }

      if (itm.table === 'objektKatalogMandant') {
        if (itm.type === DatabaseChangeType.Create && !itm.obj.gcuuid) {
          const artikelData = await db.objektKatalogGlobal.where({gcid: itm.obj.gcid}).first();
          if (artikelData) {
            itm.obj.gcuuid = artikelData.uuid;
          }
        }
      }

      if (itm.table === 'inventar') {
        if (itm.type === DatabaseChangeType.Update) {
          let isEmptyMod = false;
          if (itm.mods.mcid && !itm.mods.mcuuid) {
            console.error(
              'DbSyncClientService.sortAndFixChangeLogs() #925.' +
              'Found Inventar-Update #872 without mcuuid-Field', {...itm});
            const artikelRef = await db.objektKatalogMandant.where({mcid: itm.mods.mcid}).first();
            if (artikelRef) {
              itm.mods.mcuuid = artikelRef.uuid;
              console.log('DbSyncClientService.sortAndFixChangeLogs() #930.' +
                ' Found Inventar-Update #875 added mcuuid-Field', {...itm});
            } else {
              console.error('DbSyncClientService.sortAndFixChangeLogs() #933.' +
                ' Found Inventar-Update #875 but don t found ArtikelRef.mcuuid-Field', {...itm});
            }
            delete itm.mods.mcid;
          }
          if (Object.keys(itm.mods).length === 1 && 'modified_at' in itm.mods) {
            isEmptyMod = true;
          }
          if (Object.keys(itm.mods).length === 0) {
            isEmptyMod = true;
          }
          if (isEmptyMod) {
            console.log('DbSyncClientService.sortAndFixChangeLogs() #945.' +
              ' Removing empty Entry from Change-Log', { itm });
            db.clientChangeLog.delete(itm.id);
            itm = null;
          }
        } else if (itm.type === DatabaseChangeType.Create) {
          // Test und Korrektur falls GCUUID stat MCUUID in Inventar hinterlegt wurde
          if (this.isInDebugMode) {
            console.log('DbSyncClientService.sortAndFixChangeLogs() #953.' +
              ' Test if inventar has gcuuid instead of mcuuid, itm.obj.mcuuid: ' + itm.obj.mcuuid);
          }
          await db.objektKatalogGlobal.where({uuid: itm.obj.mcuuid}).first().then( async (rslt) => {
            if (this.isInDebugMode) {
              console.log('DbSyncClientService.sortAndFixChangeLogs() #958 result of okm-Query by mcuuid', { rslt });
            }
            if (rslt) {
              const okgItm = rslt;
              await db.objektKatalogMandant.where({gcuuid: okgItm.uuid }).first().then( (okm) => {
                itm.obj.mcuuid = okm.uuid;
                db.inventar.update(itm.obj.uuid, { mcuuid: okm.uuid });
                db.clientChangeLog.update(itm.id, {
                  obj: {
                    ...itm.obj,
                    ...{mcuuid: okm.uuid }
                  }
                });
              });
            }
            return rslt;
          })
            .catch( (reason) => {
              console.error('DbSyncClientService.sortAndFixChangeLogs() #976.' +
                ' Error on Querying for OKG by ' + itm.obj.mcuuid, {reason});
            });

          if (itm.obj.mcid && itm.obj.mcuuid) {
            if (this.isInDebugMode) {
              console.log('DbSyncClientService.sortAndFixChangeLogs() #982 Found Inventar-Update with mcuuid-Field', {...itm});
            }
            delete itm.obj.mcid;
          }
          if (itm.obj.rid && !itm.obj.ruuid) {
            if (this.isInDebugMode) {
              console.error('DbSyncClientService.sortAndFixChangeLogs() #891 Inventar-Update without ruuid-Field', {...itm});
            }
            const raum = await db.raeume.where({rid: itm.obj.rid}).first();
            if (raum) {
              itm.obj.ruuid = raum.uuid;
              if (this.isInDebugMode) {
                console.log('DbSyncClientService.sortAndFixChangeLogs() #994 Fixed Missing ruuid-Field', {...itm});
              }
            }
          }
          if (!itm.obj.ruuid || !itm.obj.mcuuid) {
            console.error('DbSyncClientService.sortAndFixChangeLogs() #999 Removing incomplete Inventar + Entry from Change-Log', { itm });
            await db.clientChangeLog.delete(itm.id);
            await db.inventar.delete(itm.uuid);
            if (itm.obj.code && itm.obj.for_jobid && itm.uuid) {
              await db.barcodeLookup
                .where({code: itm.obj.code, for_jobid: itm.obj.for_jobid})
                .filter((lkup) => lkup.uuid === itm.uuid)
                .delete();
            }
            itm = null;
          }
        }
      }

      return itm;
    }).filter( (itm) => !!itm));
  }

  public async numUnsyncedChangeLogsByJobId(jobid: number): Promise<number> {
    const rslt = this.dexieService.clientChangeLog
      .where('jobid' )
      .equals( jobid )
      // .filter(itm => !('sync_done' in itm) || itm.sync_done === 0)
      .count();

    rslt.then( num => {
      if (this.isInDebugMode) {
        console.log('DbSyncClientService.numUnsyncedChangeLogsByJobId() then #1026: ', { jobid, num });
      }
      return num;
    }).catch( err => {
      console.error('DbSyncClientService.numUnsyncedChangeLogsByJobId() catch #1030: ', { jobid, err } );
    });
    return rslt;
  }

  public async getCurrentSyncStatus(): Promise<any> {
    return Promise.all([
      this.numUnsyncedChangeLogs(),
      this.getRunningProcesses()
    ]);
  }

  public async numUnsyncedChangeLogs(): Promise<number> {
    return this.dexieService.clientChangeLog.where({sync_done: 0}).count();
  }

  private async getIncompleteInventuren(): Promise<SyncIncompleteInventuren[]> {
    try {
      let hasDexieVersionError = false;
      const tryWhere = this.dexieService.clientChangeLog.where({ sync_done: 0 });
      const tryFirst = await tryWhere.first().catch( (reason) => {
        hasDexieVersionError = true;
        console.error('DbsynClientServe.getIncompleteInventuren #1052 Abort after catched Error', { arguments });
      });
      if (hasDexieVersionError) {
        return [];
      }
    } catch (e) {
      console.error('DbsynClientServe.getIncompleteInventuren #1058 Abort after catched Error', { e });
      return [];
    }
    const numPending = await this.dexieService.clientChangeLog.where({ sync_done: 0 }).count();
    return this.dexieService.clientChangeLog
      .where({ sync_done: 0 })
      .toArray()
      .then( async list => {
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

        return Promise.all( Object.keys(listGroupedByJobid).map( (groupIdx) => {
          listGroupedByJobid[groupIdx].changes = this.sortAndFixChangeLogs(listGroupedByJobid[groupIdx].changes);
          return groupIdx;
        })).then( () => listGroupedByJobid);
      });
  }

  private async saveLastSyncErrorEvent(event: SyncServerErrorEvent): Promise<void> {
    const jobid = event.jobid;
    const insertData: DBDIServerSyncErrors[] = event.errors.map( (itm: SyncServerError) => {
      return {
        jobid,
        clientChangeLogId: itm.clientChangeLogId || null,
        table: itm.table,
        type: itm.type || null,
        uuid: itm.uuid,
        error_code: itm.ERROR_CODE,
        error_msg: itm.ERROR_MSG || '',
        error_data: itm.ERROR_DATA || null,
        error_ref_table: itm.ERROR_REF_TABLE || null,
        error_ref_by: itm.ERROR_REF_BY || null,
        error_ref_uuid: itm.ERROR_REF_UUID || null,
        timestamp: new Date()
      };
    });
    const delAction = this.dexieService.serverSyncErrors.where({jobid}).delete();
    delAction.finally(() => this.dexieService.serverSyncErrors.bulkAdd(
      insertData
    )).then( (n) => {
      if (n > 0) {
        this.resyncServerErrors(jobid);
      }
    }).finally( () => {
      this.syncErrorChange.emit({ jobid, count: event.errors.length});
    });
  }

  async resyncServerErrors(jobid: number): Promise<any> {
    const db = this.dexieService;
    console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1128`);

    const aErrors = await db.serverSyncErrors.where({jobid}).toArray();

    aErrors.map( async (err) => {
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1134`, { err });
      }
      if (!('clientChangeLogId' in err) || !err.clientChangeLogId) {
        console.error(`DBSyncClientService.resyncServerErrors(${jobid}) #1137: NO clientChangeLogId in err`, { err });
        return false;
      }
      const table = err.table;
      const uuid = err.uuid;
      const chId = err.clientChangeLogId;
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1144: `, { id: chId, table, uuid });
      }

      const logItem = await db.clientChangeLog.get(chId);

      if (!logItem || logItem.table !== table || logItem.uuid !== uuid) {
        console.error(`DBSyncClientService.resyncServerErrors(${jobid}) #1150: logItem by id `, chId, ' not found', { table, uuid });
      }

      if (this.isInDebugMode) {
        console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1154: `, {
          logItem,
          id: chId,
          table,
          uuid
        });
      }

      if (this.isInDebugMode) {
        console.log(`DBSyncClientService resyncServerErrors(${jobid}) #1163`, { logItem });
      }
      const data = await db.table( table ).get(uuid);
      if (this.isInDebugMode) {
        console.log(`DBSyncClientService resyncServerErrors(${jobid}) #1167`, { err_code: err.error_code, data });
      }

      switch (err.error_code) {
        case 'ITEM_NOT_FOUND':
          console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1172: clientChangeLog.delete `, { chId });
          await db.clientChangeLog.delete(chId);
          if (data) {
            const chgLogData: DBDIClientChangeLog = {
              jobid: logItem.jobid,
              key: 0,
              mid: logItem.mid,
              obj: data,
              sync_attempts: 0,
              sync_done: 0,
              table: logItem.table,
              timestamp: new Date(),
              type: 1,
              uid: logItem.uid,
              uuid: logItem.uuid
            };
            console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1188: clientChangeLog.add `, { chgLogData });
            db.clientChangeLog.add(chgLogData);
          }
          break;

        case 'NEWER_VERSION_ON_SERVER':
          console.log(`DBSyncClientService.resyncServerErrors(${jobid}) #1194 clientChangeLog.delete `, { chId });
          await db.clientChangeLog.delete(chId);
          break;
      }
    });
  }
}
