import {Component, OnDestroy, OnInit} from '@angular/core';
import {DBSyncClientService, SyncJobResult, SyncJobStatus} from '../../../dbsync-client.service';
import {BasedataService} from '../../../basedata.service';
import {DBDIInventuren, DBDIUsers} from '../../../dexie.service';
import {faSync, faSyncAlt} from '@fortawesome/free-solid-svg-icons';
import {DataService} from '../../service/data.service';
import {VariablesService} from '../../service/variables.service';
import {ConnectionService} from '../../../connection-service.service';
import {Subscription} from 'rxjs';

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
  currUser?: DBDIUsers;
  deviceId?: number;
  clientRevisionId?: number;
  serverRevisionId?: number;
  numServerChanges?: number;

  subscriptionAutoSyncChange: Subscription;
  subscriptionProcessStarted: Subscription;
  subscriptionProcessFinished: Subscription;
  subscriptionNetworkService: Subscription;

  private subscribedSyncJobProcesses: [SyncJobResult, Subscription][] = [];

  constructor(
    private dbsyncClient: DBSyncClientService,
    private baseData: BasedataService,
    private networkService: ConnectionService,
    private dataService: DataService) { }

  ngOnDestroy(): void {
    this.subscriptionNetworkService.unsubscribe();
    this.subscriptionAutoSyncChange.unsubscribe();
    this.subscriptionProcessStarted.unsubscribe();
    this.subscriptionProcessFinished.unsubscribe();
    this.removeAllSyncJobStatusSubscriptions();
  }

  ngOnInit() {
    this.refreshStatusInfos();

    this.subscriptionNetworkService = this.networkService.monitor().subscribe( () => {
      if (this.networkService.hasInternetAccess) {
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

    this.dbsyncClient.askServerForChanges(this.jobid).then( (infos) => {
      console.log( 'callback of async askServerForChange for jobid ' + this.jobid, { infos });
      if (infos.success) {
        this.serverRevisionId = infos.MaxRevisionId;
        this.numServerChanges = infos.NumChanges;
      }
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
  }

  syncAutoStop() {
    this.dbsyncClient.autoSyncStop();
  }

  syncAutoStart() {
    this.dbsyncClient.autoSyncStart(true);
  }

  syncCurrJob() {
    if (typeof this.syncJobid === 'number') {
      console.log('called syncCurrJob, call syncStart(' + this.syncJobid + ')');
      this.syncStart( this.syncJobid );
    } else {
      console.error('syncJobid is not defined');
    }
  }

  resetCurrJob() {
    console.log('#106 dbsync called resetCurrJob()');
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
