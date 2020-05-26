import {Component, OnInit} from '@angular/core';
import {DBSyncClientService, SyncJobResult, SyncJobStatus} from '../../../dbsync-client.service';
import {BasedataService} from '../../../basedata.service';
import {DBDIInventuren, DBDIUsers} from '../../../dexie.service';
import {faSync, faSyncAlt} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dbsync',
  templateUrl: './dbsync.component.html',
  styleUrls: ['./dbsync.component.scss']
})
export class DbsyncComponent implements OnInit {
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
  currInventur?: DBDIInventuren;
  currUser?: DBDIUsers;
  deviceId?: number;

  constructor(private dbsyncClient: DBSyncClientService, private baseData: BasedataService) { }

  ngOnInit() {
    this.jobid = this.baseData.getCurrentJobid();
    this.syncJobid = this.jobid;
    this.currInventur = this.baseData.getCurrentInventur();
    this.deviceId = this.baseData.getCurrentDeviceId();
    this.currUser = this.baseData.getCurrentUser();
    this.syncUid = this.baseData.getCurrentUid();
    this.syncDevid = this.baseData.getCurrentDeviceId();
    this.currProcess = this.dbsyncClient.getProcessByJobId( this.jobid );
    console.log({
      method: 'ngOnInit',
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

    this.dbsyncClient.processStarted.subscribe( (proc: SyncJobResult) => {
      console.log('Gestarted: Synchronisierung für Inventur mit JobId ' + proc.jobid, { proc });
      if (proc.jobid === this.syncJobid) {
        this.syncInProcess = !proc.finished;
      }
    });
    this.dbsyncClient.processFinished.subscribe( (proc: SyncJobResult) => {
      console.log('Beendet: Synchronisierung für Inventur mit JobId ' + proc.jobid, { proc });
      if (proc.jobid === this.syncJobid) {
        this.syncInProcess = !proc.finished;
      }
    });
  }

  checkForUnsyncedChanges() {
    this.dbsyncClient.numUnsyncedChangeLogsByJobId(this.jobid).then( num => {
      this.numUnsyncedChanges = num;
    });
  }

  syncCurrJob() {
    if (typeof this.syncJobid === 'number') {
      console.log('called syncCurrJob, call syncStart(' + this.syncJobid + ')');
      this.syncStart( this.syncJobid );
    } else {
      console.error('syncJobid is not defined');
    }
  }

  syncStart(jobid: number) {
    console.log('called syncStart, call dbsyncClient.syncJob(' + jobid + ')');
    const sync: Promise<SyncJobResult> = this.dbsyncClient.syncJob( jobid );
    sync.then( (proc: SyncJobResult) => {
      proc.statusChanged.subscribe( (status: SyncJobStatus) => {
        this.syncJobid = proc.jobid;
        this.syncStatus = proc.getStatus();
        this.syncStatusName = proc.getStatusName();
        this.syncErrorMsg = this.currProcess.errorMsg;
        this.syncFinished = this.currProcess.finished;
        this.syncDuration = this.currProcess.duration;
        this.syncDurFormatted = this.currProcess.durationFormatted;

        console.log('Process-Status has changed', { proc });
        this.syncInProcess = !proc.finished;
      });
    });
  }

}
