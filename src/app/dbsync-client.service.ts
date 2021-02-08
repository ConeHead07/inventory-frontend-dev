import {EventEmitter, Injectable, OnDestroy, Output} from '@angular/core';
import {ApiService} from './api.service';
import {BasedataService} from './basedata.service';
import {DexieService} from './dexie.service';
import {DBDIBarcodeLookup, DBDIClientChangeLog, DBDIServerSyncErrors} from './dexie.interfaces';
import {ConnectionService} from './connection-service.service';
import {VariablesService} from './inventory/service/variables.service';
import {DbsyncLogService, TableSyncProgress} from './dbsync-log.service';
import {DatabaseChangeType} from 'dexie-observable/api';
import {Subscription} from 'rxjs';

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
    private dbSyncLogService: DbsyncLogService) {

    this.subscriptionClientLogsChanged = this.dexieService.clientSyncAmountChanged.subscribe( (amount) => {
      console.log('DBSyncClientService #245 clientSyncAmountChanged: ', { amount });
    });
    this.autoSyncStart();
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
    const isDBSyncService = (this instanceof DBSyncClientService);
    console.log('#233 dbsync-client.service sync() this is DBSyncClientService', { isDBSyncService });
    if (!isDBSyncService) {
      console.error('#235 dbsync-client.service sync() this is not correct binded to Instance of DBSyncClientService');
      return;
    }

    const currJobId = this.baseData.getCurrentJobid();
    console.log('#240 dbsync-client.service sync() currJobId:', currJobId);
    console.log('#241 dbsync-client.service sync() call getIncompleteInventuren()');
    const incompleteInventurLogs = await this.getIncompleteInventuren();

    const currJobIdx = incompleteInventurLogs.map( itm => itm.jobid ).indexOf( currJobId );
    console.log('#245 dbsync-client.service sync() currJobIdx: ', currJobIdx);

    if (currJobIdx !== -1) {
      console.log('#248 dbsync-client.service sync()');
      const currJob = incompleteInventurLogs[ currJobIdx ];
      incompleteInventurLogs.slice( currJobIdx, 1);
      console.log('#251 dbsync-client.service sync(), call sendByJobId(', currJob.jobid, currJob.changes, ')');
      this.sendByJobId( currJob.jobid, currJob.changes);
    }

    for (const logs of incompleteInventurLogs) {
      console.log('#256 dbsync-client.service sync(), call sendByJobId(', logs.jobid, logs.changes, ')');
      this.sendByJobId( logs.jobid, logs.changes );
    }

    console.log('#260 dbsync-client.service END');
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
    console.log('#298 dbsync-client.service setCurrentClientRevId(newRevId: ', newRevId, ')');
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

  async syncJob(jobid: number): Promise<SyncJobResult> {
    console.log('[called DBSyncClientService syncJob()] call this.clearFinishedProcesses');
    this.clearFinishedProcesses();

    console.log('[called syncJob] call this.processes.find(proc => proc.jobid === ' + jobid + ')');
    const currJobProc = this.processes.find( proc => proc.jobid === jobid);
    const newJob = new SyncJobResult(jobid);

    if (currJobProc && !currJobProc.finished) {
      console.log('Doppelter Sync-Aufruf. Sync für Job ' + jobid + ' läuft bereits!', { currJobProc});
      newJob.alreadyStartedProcess = currJobProc;
      console.log('[called syncJob] call newJob.finish(AlreadyStarted)');
      return newJob.finish(SyncJobStatus.AlreadyStarted,
        'Sync-Process is already running. Duration: ' + currJobProc.durationFormatted
      );
    }

    console.log('[called syncJob] call this.numUnsyncedChangeLogsByJobId(' + jobid + ')');
    const numChanges = await this.numUnsyncedChangeLogsByJobId(jobid);
    if (!numChanges) {
      console.log('[called syncJob] numClientChanges: ' + numChanges);
      // return newJob.finish(SyncJobStatus.AbortedEmptyChangeLogs);
    }

    console.log('[called syncJob] call this.sendByJobId(' + jobid + ', [], newJob)');
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
    console.log('[called sendByJobId](' + useJobid + ', useLogs(', { useLogs, useJobResult });
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
      console.error('#369 dbsync-client.service sendByJobId() Synchronisatioon wurde abgebrochen wegen fehlender Serververbindung!');
      return this.finishProcess(
        syncJobResult,
        SyncJobStatus.Offline,
        'Synchronisatioon wurde abgebrochen wegen fehlender Serververbindung!'
      );
    }

    const ServerInfo = await this.askServerForChanges();

    const devid = this.baseData.getCurrentDeviceId() || 0;
    const lastRevIdVar = `jobid-${jobid}-revision-id`;

    let lastRevId = (await this.settings.get(lastRevIdVar)) || 0;
    const jobInProcess = this.processes.find(proc => proc.jobid === jobid);

    if (jobInProcess && !jobInProcess.finished) {
      console.error('#369 dbsync-client.service sendByJobId() Synchronisatioon wurde abgebrochen. Sync läuft bereits');
      syncJobResult.alreadyStartedProcess = jobInProcess;
      return syncJobResult.finish(SyncJobStatus.AlreadyStarted);
    }

    syncJobResult.setStatus(SyncJobStatus.Pending);
    this.processStarted.emit(syncJobResult);

    if (!useLogs || !useLogs.length) {
      console.error('#395 dbsync-client.service sendByJobId() Keine Client-Änderungen!');
      syncJobResult.setStatus(SyncJobStatus.QueryChangeLogs);
      useLogs = await this.getUnsyncedChangeLogsByJobId(useJobid);
    }

    if (!useLogs && !ServerInfo.NumChanges) {
      console.error('#369 dbsync-client.service sendByJobId(); Synchronisatioon wurde abgebrochen. Keine Änderungen!');
      return this.finishProcess(syncJobResult, SyncJobStatus.AbortedEmptyChangeLogs);
    }
    let logs = useLogs;

    syncJobResult.sendClientDeviceId = devid;
    syncJobResult.committedIds = logs.map<number>((itm) => itm.id);

    // ASK for Server-Changes
    console.log('#410 dbsync-client.service sendByJobId(); call this.processes.push(syncJobResult)');
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
      console.log('#421 dbsync-client.service sendByJobId() Synchronisations-Loop!', { syncJobLoop, lastRevId, logs });

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
            console.error(data.errorMsg);
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
          console.log('Changes wurden gesendet, verarbeite Response', {
            aSyncedChangeIds: data.aSyncedChangeIds ? data.aSyncedChangeIds.length : 0,
            aFailedChangeIds: data.aFailedChangeIds ? data.aFailedChangeIds.length : 0,
            serverRechanges: data.serverRechanges ? data.serverRechanges.length : 0,
            serverChanges: data.serverChanges.rows ? data.serverChanges.rows.length : 0
          });

          console.log('Process sync_done');
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

          console.log('Process serverRechanges');
          if (data.serverRechanges && data.serverRechanges.length > 0) {
            syncLogMsg('Korrigiere Client-Ids nach Server-Antwort ...');
            syncJobResult.setStatus(SyncJobStatus.WriteServerReChanges);
            await Promise.all(data.serverRechanges.map(async (chg) => {
              chg.table = chg.table[0].toLowerCase() + chg.table.substr(1);
              chg.mods.log = false;
              return this.dexieService.table(chg.table).where({uuid: chg.uuid}).modify(chg.mods);
            }));
          }

          console.log('Process serverChanges');

          if (data.serverChanges.rows && data.serverChanges.rows.length > 0) {
            syncLogMsg('Import Server-Changes ...');
            syncJobResult.setStatus(SyncJobStatus.WriteServerChanges);
            const chgLen = data.serverChanges.rows.length;
            for (let ci = 0; ci < chgLen; ci++) {
              const chg = data.serverChanges.rows[ci];
              const currRevId = chg.revision_id;
              if (currRevId < lastRevId) {
                const err = '#501 SYNC-FEHLER: LastRevId ist größer als CurrRevID: ' + lastRevId + ' > ' + currRevId;
                console.error(err);
                alert(err);
                return;
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
                  console.log('#494 ' + ci + '/' + chgLen +
                    ' dbsync-client.service. await this.dexieService.table( ' + chg.table + ' ).put( objInsertData )', objInsertData);
                  await this.dexieService.table(chg.table).put(objInsertData);
                  break;

                case 2: // Update
                  tableLogs[chg.table].modified++;
                  const objUpdateData = { ...(JSON.parse(chg.mods)), ...{ log: false }};
                  console.log('#499 ' + ci + '/' + chgLen +
                    ' dbsync-client.service. await this.dexieService.table( ' + chg.table + ' )' +
                    '.where({uuid:' + chg.uuid + '}).modify( objUpdateData )', chg);
                  await this.dexieService.table(chg.table)
                    .where({uuid: chg.uuid})
                    .modify(objUpdateData);
                  break;

                case 3: // Delete
                  tableLogs[chg.table].deleted++;
                  console.log('#329 ' + ci + '/' + chgLen +
                    ' dbsync-client delete ' + chg.table + ' by uuid ' + chg.uuid );
                  await this.dexieService.table(chg.table)
                    .where({uuid: chg.uuid})
                    .delete();
              }

              executed++;
              tableLogs[chg.table].executed++;
              lastRevId = currRevId;
              console.log('511 ' + ci + '/' + chgLen +
                ' dbsync-client.service await this.settings.set(', lastRevIdVar, chg.revision_id, ')');
              await this.settings.setRevId(lastRevIdVar, chg.revision_id, 'LogRow ' + ci + '/' + chgLen + '; RevId ' + currRevId);

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

          console.log('Process SyncResponse finished');
          syncJobResult.revisionId = await this.settings.get(lastRevIdVar);
          syncJobResult.committed = logs ? logs.length : 0;
          syncJobResult.synced = data.aSyncedChangeIds ? data.aSyncedChangeIds.length : 0;
          syncJobResult.conflicts = data.aFailedChangeIds ? data.aFailedChangeIds.length : 0;
          syncJobResult.numServerRechanges = data.serverRechanges ? data.serverRechanges.length : 0;
          syncJobResult.numServerChanges = data.serverChanges ? data.serverChanges.rows.length : 0;

          console.log('#508 dbsync-client.service, data.serverChanges.total:', data.serverChanges.total);

          for (const logData of Object.values(tableLogs)) {
            syncLogData(logData);
            logData.lastEmittedrevisionId = logData.revisionId;
          }

          if (data.serverChanges.rows.length < data.serverChanges.total) {
            console.log('#511 keep SyncProcess(jobid: ' + syncJobResult.jobid + ') open');
            return syncJobResult;
          }
          console.log('#514 finish SyncProcess(jobid: ' + syncJobResult.jobid + ')');
          syncLogMsg('Aktuelle Synchronisation wurde abgeschlossen');
          return this.finishProcess(syncJobResult, SyncJobStatus.Finished);
        }
      );
    }
  }

  async addBarcodeToLookupTable(
    code: DBDIBarcodeLookup['code'], table: DBDIBarcodeLookup['table'],
    uuid: DBDIBarcodeLookup['uuid'], forJobid: DBDIBarcodeLookup['for_jobid'],
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
    console.log('DBSyncClientService #668 processList before clearFinishedProcesses', { ...this.processes.map(p => p) });
    this.processes = this.processes.filter( proc => {
      const finished = !proc.finished;
      if (finished) {
        proc = null;
      }
      return !finished;
    } );
    this.processingJobids = this.processes.map<number>( proc => proc.jobid );
    console.log('DBSyncClientService #677 processList after clearFinishedProcesses', { ...this.processes.map(p => p) });
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
    const tablePrio = [ 'inventar', 'objektKatalogMandant', 'objektKatalogGlobal', 'hersteller' ];
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
    console.log('DbSyncClientService #866 sortAndFixChangeLogs', { ...list });
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
          console.log('DbSyncClientService #881 Removing empty Entry from Change-Log', { itm });
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
            console.error('DBSyncClient Found Inventar-Update #872 without mcuuid-Field', {...itm});
            const artikelRef = await db.objektKatalogMandant.where({mcid: itm.mods.mcid}).first();
            if (artikelRef) {
              itm.mods.mcuuid = artikelRef.uuid;
              console.log('DBSyncClient Found Inventar-Update #875 added mcuuid-Field', {...itm});
            } else {
              console.error('DBSyncClient Found Inventar-Update #875 but don t found ArtikelRef.mcuuid-Field', {...itm});
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
            console.log('DbSyncClientService #908 Removing empty Entry from Change-Log', { itm });
            db.clientChangeLog.delete(itm.id);
            itm = null;
          }
        } else if (itm.type === DatabaseChangeType.Create) {
          // Test und Korrektur falls GCUUID stat MCUUID in Inventar hinterlegt wurde
          console.log('DBSyncClient #849 Test if inventar has gcuuid instead of mcuuid, itm.obj.mcuuid: ' + itm.obj.mcuuid);
          await db.objektKatalogGlobal.where({uuid: itm.obj.mcuuid}).first().then( async (rslt) => {
            console.log('DbSyncClientService #851 result of okm-Query by mcuuid', { rslt });
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
              console.error('DBSyncClient #865 Error on Querying for OKG by ' + itm.obj.mcuuid, {reason});
            });

          if (itm.obj.mcid && itm.obj.mcuuid) {
            console.log('DBSyncClient Found Inventar-Update #872 with mcuuid-Field', {...itm});
            delete itm.obj.mcid;
          }
          if (itm.obj.rid && !itm.obj.ruuid) {
            console.error('DBSyncClient Found Inventar-Update #872 without ruuid-Field', {...itm});
            const raum = await db.raeume.where({rid: itm.obj.rid}).first();
            if (raum) {
              itm.obj.ruuid = raum.uuid;
              console.log('Fixed Missing ruuid-Field', {...itm});
            }
          }
          if (!itm.obj.ruuid || !itm.obj.mcuuid) {
            console.error('DbSyncClientService #938 Removing incomplete Inventar + Entry from Change-Log', { itm });
            db.clientChangeLog.delete(itm.id);
            db.inventar.delete(itm.uuid);
            if (itm.obj.code && itm.obj.for_jobid && itm.uuid) {
              db.barcodeLookup
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
      console.log('then numUnsyncedChangeLogsByJobId: ', { jobid, num });
      return num;
    }).catch( err => {
      console.error('then numUnsyncedChangeLogsByJobId: ', { jobid, err } );
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
    console.log('DBSyncClientService resyncServerErrors #980');

    const aErrors = await db.serverSyncErrors.where({jobid}).toArray();

    aErrors.map( async (err) => {
      console.log('DBSyncClientService resyncServerErrors #983', { err });
      if (!('clientChangeLogId' in err) || !err.clientChangeLogId) {
        console.error('DBSyncClientService resyncServerErrors #985 NO clientChangeLogId in err', { err });
        return false;
      }
      const table = err.table;
      const uuid = err.uuid;
      const chId = err.clientChangeLogId;
      console.log('DBSyncClientService resyncServerErrors #992 ', { id: chId, table, uuid });

      const logItem = await db.clientChangeLog.get(chId);

      if (!logItem || logItem.table !== table || logItem.uuid !== uuid) {
        console.error('logItem by id ', chId, ' not found', { table, uuid });
      }

      console.log('DBSyncClientService resyncServerErrors #998 ', {
        logItem,
        id: chId,
        table,
        uuid
      });

      console.log('DBSyncClientService resyncServerErrors #1003', { logItem });
      const data = await db.table( table ).get(uuid);
      console.log('DBSyncClientService resyncServerErrors #1005', { err_code: err.error_code, data });

      switch (err.error_code) {
        case 'ITEM_NOT_FOUND':
          console.log('DBSyncClientService resyncServerErrors #1009 clientChangeLog.delete ', { chId });
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
            console.log('DBSyncClientService resyncServerErrors #1025 clientChangeLog.add ', { chgLogData });
            db.clientChangeLog.add(chgLogData);
          }
          break;

        case 'NEWER_VERSION_ON_SERVER':
          console.log('DBSyncClientService resyncServerErrors #1031 clientChangeLog.delete ', { chId });
          await db.clientChangeLog.delete(chId);
          break;
      }
    });
  }
}
