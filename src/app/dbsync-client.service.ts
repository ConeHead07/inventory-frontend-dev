import {EventEmitter, Injectable, Output} from '@angular/core';
import {ApiService} from './api.service';
import {BasedataService} from './basedata.service';
import {DexieService} from './dexie.service';
import {DBDIBarcodeLookup, DBDIClientChangeLog} from './dexie.interfaces';
import {ConnectionService} from './connection-service.service';
import {VariablesService} from './inventory/service/variables.service';
import {DbsyncLogService, TableSyncProgress} from './dbsync-log.service';

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

interface SyncMappedIds {
  hersteller?: {[key: string]: number }[];
  objektKatalogGlobal?: {[key: string]: number }[];
  objektKatalogMandant?: {[key: string]: number }[];
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

interface SyncServerResponseTest {
  syncMappedIds?: SyncMappedIds;
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
export class DBSyncClientService {

  private status: 0;
  private processes: SyncJobResult[] = [];
  private processingJobids: number[] = [];
  public processStarted = new EventEmitter<SyncJobResult>();
  public processFinished = new EventEmitter<SyncJobResult>();
  private syncIntervalTimer = null;
  private fullImportJobid = 0;

  @Output() autoSyncChange = new EventEmitter<boolean>();

  constructor(
    private dexieService: DexieService,
    private apiService: ApiService,
    private baseData: BasedataService,
    private networkService: ConnectionService,
    private settings: VariablesService,
    private dbSyncLogService: DbsyncLogService) {

    this.autoSyncStart();
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
    return await this.settings.set( lastRevIdVar, newRevId);
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
    console.log('[called sendByJobId](' + useJobid + ', useLogs, useJobResult)');
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
              await this.dexieService.table(chg.table).where({uuid: chg.uuid}).modify(chg.mods);
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
                  console.log('#494 ' + ci + '/' + chgLen +
                    ' dbsync-client.service. await this.dexieService.table( ' + chg.table + ' ).put( chg.obj )', chg);
                  await this.dexieService.table(chg.table).put(JSON.parse(chg.obj));
                  break;

                case 2: // Update
                  tableLogs[chg.table].modified++;
                  console.log('#499 ' + ci + '/' + chgLen +
                    ' dbsync-client.service. await this.dexieService.table( ' + chg.table + ' )' +
                    '.where({uuid:' + chg.uuid + '}).modify( chg.mods )', chg);
                  await this.dexieService.table(chg.table)
                    .where({uuid: chg.uuid})
                    .modify(JSON.parse(chg.mods));
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
              await this.settings.set(lastRevIdVar, chg.revision_id, 'LogRow ' + ci + '/' + chgLen + '; RevId ' + currRevId);

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

    tblBarcodeLookup.put({
      code,
      table,
      key,
      id,
      for_jobid: forJobid,
      uuid,
      updateHelper
    });
    return true;
  }

  async sendByJobId_ALT(useJobid: number, useLogs?: DBDIClientChangeLog[], useJobResult?: SyncJobResult): Promise<SyncJobResult> {
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

    if (!this.networkService.hasServerAccess) {
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
      gebaeude: this.settings.get( `gebaeude-${jobid}-download-success`),
      objektKatalogGlobal: this.settings.get( `objektKatalogGlobal-${jobid}-download-success`),
      objektKatalogMandant: this.settings.get( `objektKatalogGlobal-${jobid}-download-success`),
      objektbuchBarcodesLookupt: this.settings.get( `objektbuchBarcodesLookup-${jobid}-download-success`),
      inventar: this.settings.get( `inventar-${jobid}-download-success`),
      raeume: this.settings.get( `raeume-${jobid}-download-success`),
      images: this.settings.get( `images-${jobid}-download-success`),
      hersteller: this.settings.get( `hersteller-${jobid}-download-success`),
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
        if ('errorMsg' in data && data.errorMsg) {
          syncJobResult.errorMsg = data.errorMsg;
        }
        console.log('#26 Response of sendByJobId', { data });
        if ( ('setClientDeviceId' in data) && data.setClientDeviceId > 0) {
          this.baseData.setCurrentDevice( data.setClientDeviceId );
        }
        syncJobResult.confirmed = data.syncedLogIds.length;
        syncJobResult.confirmedIds = data.syncedLogIds;
        syncJobResult.unsynced = syncJobResult.committed - syncJobResult.confirmed;
        syncJobResult.serverChanges = data.serverChangeLogs;

        if (data.syncMappedIds) {
          for (let tableName of Object.keys(data.syncMappedIds)) {
            tableName = tableName[0].toLowerCase() + tableName.substr(1);
            if (data.syncMappedIds[tableName]) {
              const table = this.dexieService.table(tableName);
              const tblKey = table.schema.primKey.keyPath[0];
              for (const oldId in data.syncMappedIds[tableName]) {
                if (data.syncMappedIds[tableName].hasOwnProperty(oldId)) {
                  const modKey: any = {};
                  modKey[tblKey] = data.syncMappedIds[tableName][oldId];
                  table.where(tblKey).equals(oldId).modify(modKey);
                }
              }
            }
          }
        }

        if (syncJobResult.serverChanges) {
          const tblChanges = syncJobResult.serverChanges;
          for (let table of Object.keys(tblChanges) ) {
            table = table[0].toLowerCase() + table.substr(1);
            if (tblChanges.hasOwnProperty(table)) {
              if ('inserts' in tblChanges[table] && tblChanges[table].inserts.length > 0) {
                this.dexieService.table(table).bulkAdd(tblChanges[table].inserts);
              }
              if ('updates' in tblChanges[table] && tblChanges[table].updates.length > 0) {
                this.dexieService.table(table).bulkPut(tblChanges[table].updates);
              }
            }
          }
        }

        if ('errorMsg' in data && data.errorMsg) {
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

    if ('errorMsg' in syncJobResult && syncJobResult.errorMsg) {
      return this.finishProcess(syncJobResult, SyncJobStatus.FinishedWithErrors, syncJobResult.errorMsg);
    } else {
      return this.finishProcess(syncJobResult, SyncJobStatus.Finished );
    }
  }

  public clearFinishedProcesses() {
    this.processes = this.processes.filter( proc => {
      const finished = !proc.finished;
      if (finished) {
        proc = null;
      }
      return !finished;
    } );
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
