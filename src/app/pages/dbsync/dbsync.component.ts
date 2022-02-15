import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  DBSyncClientService,
  SyncJobResult,
  SyncJobStatus,
  SyncServerError, SyncServerErrorChange,
  SyncServerErrorEvent, TableCounts
} from '../../shared/services/dbsync-client.service';
import {BasedataService} from '../../shared/services/basedata.service';
import {DBDIInventuren, DBDIServerSyncErrors} from '../../shared/interfaces/dexie.interfaces';
import {faSync, faSyncAlt} from '@fortawesome/free-solid-svg-icons';
import {DataService} from '../../shared/services/data.service';
import {ConnectionService} from '../../shared/services/connection-service.service';
import {Subscription} from 'rxjs';
import {
  DbsyncLogService,
  TableSyncProgress,
  TotalSyncProgress,
  SyncMessage,
  SyncError
} from '../../shared/services/dbsync-log.service';
import {User} from '../auth/user.model';
import {DexieService} from '../../shared/services/dexie.service';

interface TotalSyncProgressPct extends TotalSyncProgress {
  percent: number;
}

interface TableStat {
  table: string;
  numItems: number;
  totalBytes: number;
  totalBytesReadable?: string;
}

@Component({
  selector: 'app-dbsync',
  templateUrl: './dbsync.component.html',
  styleUrls: ['./dbsync.component.scss']
})
export class DbsyncComponent implements OnInit, OnDestroy {
  faSync = faSync;
  faSyncAlt = faSyncAlt;

  jobid?: number;
  numUnsyncedChanges?: number;
  currProcess?: SyncJobResult;
  syncInProcess = true;
  syncJobid?: number;
  syncStatus?: SyncJobStatus;
  syncStatusName?: string;
  syncFinished?: boolean;
  syncErrorMsg?: string;
  syncDuration?: number;
  syncUid?: number;
  syncDevid?: number;
  syncDurFormatted?: string;
  syncAutoRun?: boolean;
  currInventur?: DBDIInventuren;
  currUser?: User;
  deviceId?: number;
  clientRevisionId?: number;
  serverRevisionId?: number;
  numServerChanges?: number;

  syncTotal: TotalSyncProgressPct;
  syncTables: TableSyncProgress[] = [];
  unsyncedTableCounts: TableStat[] = [];

  subscriptionAutoSyncChange: Subscription;
  subscriptionProcessStarted: Subscription;
  subscriptionProcessFinished: Subscription;
  subscriptionNetworkService: Subscription;

  subscriptionSyncTable: Subscription;
  subscriptionSyncTotal: Subscription;
  subscriptionSyncMsg: Subscription;
  subscriptionSyncErr: Subscription;
  subscriptionLastSyncErr: Subscription;

  lastServerSyncJobid: number;
  lastServerSyncErrors: DBDIServerSyncErrors[] = [];
  lastServerSyncDate: Date;

  private subscribedSyncJobProcesses: [SyncJobResult, Subscription][] = [];

  constructor(
    private dbsyncClient: DBSyncClientService,
    private baseData: BasedataService,
    private networkService: ConnectionService,
    private dataService: DataService,
    private dbsyncLogService: DbsyncLogService,
    private dexie: DexieService) {
    this.syncTotal = {
      jobid: 0,
      revisionId: 0,
      total: 0,
      executed: 0,
      percent: 0,
      puts: 0,
      modified: 0,
      deleted: 0,
      tables: [],
      chunks: 0,
      start: null
    };
  }

  ngOnDestroy(): void {
    this.subscriptionSyncTotal.unsubscribe();
    this.subscriptionSyncTable.unsubscribe();
    this.subscriptionSyncMsg.unsubscribe();
    this.subscriptionSyncErr.unsubscribe();
    this.subscriptionNetworkService.unsubscribe();
    this.subscriptionAutoSyncChange.unsubscribe();
    this.subscriptionProcessStarted.unsubscribe();
    this.subscriptionProcessFinished.unsubscribe();
    this.subscriptionLastSyncErr.unsubscribe();
    this.removeAllSyncJobStatusSubscriptions();
  }

  ngOnInit() {
    this.jobid = this.baseData.getCurrentJobid();
    this.refreshStatusInfos();
    this.loadServerSyncErrors(this.jobid);
    this.syncAutoRun = this.dbsyncClient.autoSyncIsRunning();

    this.subscriptionLastSyncErr = this.dbsyncClient.syncErrorChange.subscribe( (result: SyncServerErrorChange) => {
      this.lastServerSyncErrors = [];
      if (result.count > 0) {
        this.loadServerSyncErrors(result.jobid);
      }
    });

    this.subscriptionSyncTable = this.dbsyncLogService.tableSyncProgress
      .subscribe( (data: TableSyncProgress) => {
      const tb = data.table;
      const rv = data.revisionId;
      const num = data.executed;
      let syncTbl = this.syncTables.find( t => t.table === data.table);
      if (!syncTbl) {
        syncTbl = { ...data };
        this.syncTables.push(syncTbl);
      } else {
        syncTbl.executed = data.executed;
        syncTbl.puts = data.puts;
        syncTbl.modified = data.modified;
        syncTbl.deleted = data.deleted;
      }
    });
    this.subscriptionSyncTotal = this.dbsyncLogService.totalSyncProgress
      .subscribe( (data: TotalSyncProgress) => {
        this.refreshStatusInfos();
        if (data.executed === 0) {
          while (this.syncTables.length) {
            this.syncTables.pop();
          }
        }
        for (const k of Object.keys(data)) {
          this.syncTotal[ k ] = data[ k ];
        }
    });

    this.subscriptionSyncMsg = this.dbsyncLogService.syncMessage
      .subscribe( (data: SyncMessage) => {
        this.refreshStatusInfos();

    });

    this.subscriptionSyncErr = this.dbsyncLogService.syncError
      .subscribe( (data: SyncError) => {
        this.refreshStatusInfos();
      });

    this.subscriptionNetworkService = this.networkService.monitor().subscribe( () => {
      if (this.networkService.hasServerAccess) {
        this.refreshStatusInfos();
      }
    });

    this.subscriptionAutoSyncChange = this.dbsyncClient.autoSyncChange.subscribe( (isRunning) => {
      this.syncAutoRun = isRunning;
    });

    this.subscriptionProcessStarted = this.dbsyncClient.processStarted.subscribe( (proc: SyncJobResult) => {
      console.log('Gestarted: Synchronisierung für Inventur mit JobId ' + proc.jobid, { proc });
      if (proc.jobid === this.syncJobid) {
        this.syncInProcess = !proc.finished;
      }
    });

    this.subscriptionProcessFinished = this.dbsyncClient.processFinished.subscribe( (proc: SyncJobResult) => {
      console.log('Beendet: Synchronisierung für Inventur mit JobId ' + proc.jobid, { proc });
      if (proc.jobid === this.syncJobid) {
        this.syncInProcess = !proc.finished;
      }
    });
  }

  getBytesReadable(bytes: number): string {
    if (bytes < 1024) {
      return bytes.toString(10) + ' Bytes';
    }
    if (bytes < 1024 * 1024) {
      return Math.round(bytes / 1024).toString(10) + ' KB';
    }
    const mb = Math.floor(bytes / (1024 * 1024));
    const rest = (bytes % (1024 * 1024));
    let restReadable = '';
    if (rest) {
      restReadable = ',' + Math.floor((999424 / 1024 / 1024) * 10).toString(10);
    }
    return mb.toString(10) + restReadable + ' MB';
  }

  async loadServerSyncErrors(jobid): Promise<number> {
    return this.dexie.serverSyncErrors
      .where({jobid})
      .toArray()
      .then( (errors) => {
        errors.find( (itm) => {
          if (itm.timestamp instanceof Date) {
            this.lastServerSyncDate = itm.timestamp;
            return true;
          }
          return false;
        });
        this.lastServerSyncJobid = jobid;
        this.lastServerSyncErrors = errors;

        return errors.length;
      });
  }

  async refreshStatusInfos() {
    this.jobid = this.baseData.getCurrentJobid();
    this.syncJobid = this.jobid;
    this.currInventur = this.baseData.getCurrentInventur();
    this.deviceId = this.baseData.getCurrentDeviceId();
    this.currUser = this.baseData.getCurrentUser();
    this.syncUid = this.baseData.getCurrentUid();
    this.syncDevid = this.baseData.getCurrentDeviceId();
    this.currProcess = this.dbsyncClient.getProcessByJobId( this.jobid );

    console.log({
      method: 'refreshStatusInfos',
      syncUid: this.syncUid,
      syncUser: this.baseData.getCurrentUser(),
      syncDevid: this.syncDevid,
      syncStatus: this.syncStatus,
      syncFinished: this.syncFinished
    });

    this.checkForUnsyncedChanges();
    if (this.currProcess) {
      this.syncInProcess = !this.currProcess.finished;
      this.syncJobid = this.currProcess.jobid;
      this.syncStatus = this.currProcess.getStatus();
      this.syncStatusName = this.currProcess.getStatusName();
      this.syncErrorMsg = this.currProcess.errorMsg;
      this.syncFinished = this.currProcess.finished;
      this.syncDuration = this.currProcess.duration;
      this.syncDurFormatted = this.currProcess.durationFormatted;

      console.log('Synchronisierung läuft ...', { proc: this.currProcess });
    } else {
      console.log('Synchronisierung läuft nicht ...');
      this.syncStatus = SyncJobStatus.Init;
      this.syncFinished = true;
      this.syncInProcess = false;
    }

    console.log('DbsyncComponent.refreshStatusInfos() #248 call askServerForChanges', (new Date()).toString());
    this.dbsyncClient.getLastServerChanges(this.jobid, 15 * 1000)
      .then( (infos) => {
        console.log( 'DbsyncComponent.refreshStatusInfos() #250 callback of async askServerForChange for jobid ' + this.jobid, { infos });
        if (infos.success) {
          this.serverRevisionId = infos.MaxRevisionId;
          this.numServerChanges = infos.NumChanges;
        }
      })
      .catch( (reason) => {
        console.error('DbsyncComponent.refreshStatusInfos() #257', { reason });
      });

    this.dbsyncClient.getCurrentClientRevId().then( (revid) => {
      this.clientRevisionId = revid;
    });

    this.syncAutoRun = this.dbsyncClient.autoSyncIsRunning();
  }

  checkForUnsyncedChanges() {
    this.dbsyncClient.numUnsyncedChangeLogsByJobId(this.jobid).then( num => {
      this.numUnsyncedChanges = num;
    });

    console.log('#299 call this.dbsyncClient.getUnsyncedTableCounts(jobid)', { jobid: this.jobid });
    this.dbsyncClient.getUnsyncedTableCounts(this.jobid).then( tableCounts => {

      this.unsyncedTableCounts.length = 0;

      for (const tb in tableCounts ) {
        if (!tableCounts.hasOwnProperty(tb)) {
          continue;
        }

        this.unsyncedTableCounts.push({
          table: tb,
          numItems: tableCounts[tb].numItems,
          totalBytes: tableCounts[tb].totalBytes,
          totalBytesReadable: this.getBytesReadable(tableCounts[tb].totalBytes)
        });
      }
    });
  }

  syncAutoStop() {
    this.dbsyncClient.autoSyncStop();
  }

  syncAutoStart() {
    this.dbsyncClient.autoSyncStart(true);
  }

  async syncCurrJob() {
    if (typeof this.syncJobid === 'number') {
      console.log('called syncCurrJob, call syncStart(' + this.syncJobid + ')');
      this.syncStart( this.syncJobid );
    } else {
      console.error('syncJobid is not defined');
    }
  }

  async resetCurrJob() {
    console.log('#287 dbsync called resetCurrJob() this.syncJobid: ', this.syncJobid);
    this.syncInProcess = true;
    this.dataService.loadInventurDataByInventurId(this.syncJobid, true).finally( () => {
      this.syncInProcess = false;
    });
  }

  syncStart(jobid: number) {
    console.log('called syncStart, call dbsyncClient.syncJob(' + jobid + ')');
    const sync: Promise<SyncJobResult> = this.dbsyncClient.syncJob( jobid );

    sync.then( (proc: SyncJobResult) => {
      if (this.isSyncJobStatusSubscribed(proc)) {
        return;
      }
      const syncJobStatusChangeSubscription = proc.statusChanged.subscribe( (status: SyncJobStatus) => {
        this.syncJobid = proc.jobid;
        this.syncStatus = proc.getStatus();
        this.syncStatusName = proc.getStatusName();
        this.syncErrorMsg = this.currProcess && ('errorMsg' in this.currProcess) ? this.currProcess.errorMsg : '';
        this.syncFinished = this.currProcess ? this.currProcess.finished : null;
        this.syncDuration = this.currProcess ? this.currProcess.duration : null;
        this.syncDurFormatted = this.currProcess ? this.currProcess.durationFormatted : '';

        console.log('Process-Status has changed', { proc });
        this.syncInProcess = !proc.finished;

        if (proc.finished) {
          console.log('#186 dbsync.component remove/unsubscribe finished SyncJob');
          this.removeSyncJobStatusSubscriptionBySub( syncJobStatusChangeSubscription );
        }
      });
      this.addSyncJobStatusSubscription(proc, syncJobStatusChangeSubscription);
    });
  }

  private isSyncJobStatusSubscribed(proc: SyncJobResult): boolean {
    const foundProc = this.subscribedSyncJobProcesses.find( p => p[0] === proc );
    return !!foundProc;
  }

  private addSyncJobStatusSubscription(proc: SyncJobResult, sub: Subscription) {
    console.log('#200 dbsync.component addSyncJobStatusSubscription');
    this.subscribedSyncJobProcesses.push( [proc, sub] );
  }

  private removeSyncJobStatusSubscriptionBySub(sub: Subscription) {
    console.log('#204 dbsync.component removeSyncJobStatusSubscriptionBySub');
    const foundProc = this.subscribedSyncJobProcesses.find( p => p[1] === sub );
    if (foundProc) {
      console.log('#207 dbsync.component foundProc');
      foundProc[1].unsubscribe();
      this.subscribedSyncJobProcesses = this.subscribedSyncJobProcesses.filter( p => p !== foundProc );
    }
  }

  private removeSyncJobStatusSubscriptionByProc(proc: SyncJobResult) {
    console.log('#214 dbsync.component removeSyncJobStatusSubscriptionByProc');
    const foundProc = this.subscribedSyncJobProcesses.find( p => p[0] === proc );
    if (foundProc) {
      console.log('#217 dbsync.component foundProc');
      foundProc[1].unsubscribe();
      this.subscribedSyncJobProcesses = this.subscribedSyncJobProcesses.filter( p => p !== foundProc );
    }
  }

  private removeAllSyncJobStatusSubscriptions() {
    console.log('#224 dbsync.component removeSyncJobStatusSubscriptionByProc');
    this.subscribedSyncJobProcesses.forEach( proc => {
      proc[1].unsubscribe();
    });
    this.subscribedSyncJobProcesses.length = 0;
  }

}
