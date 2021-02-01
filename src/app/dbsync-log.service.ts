import {EventEmitter, Injectable} from '@angular/core';

export interface TableSyncProgress {
  jobid: number;
  table: string;
  revisionId: number;
  executed: number;
  total: number;
  puts?: number;
  modified?: number;
  deleted?: number;
  lastEmittedrevisionId: number;
}
export interface TableSyncTotal {
  table: string;
  executed: number;
  total: number;
}

export interface TotalSyncProgress {
  jobid: number;
  revisionId: number;
  executed: number;
  total: number;
  puts: number;
  modified: number;
  deleted: number;
  tables: TableSyncTotal[];
  tableSyncDetails?: {[key: string]: TableSyncProgress };
  chunks: number;
  start: Date;
}
export interface SyncMessage {
  jobid: number;
  message: string;
}
export interface SyncError {
  jobid: number;
  message: string;
}
export interface LoadingMetaData {
  message: string;
  table?: string;
  executed?: number;
  total?: number;
}
export interface LoadingMetaMessage {
  message: string;
}

export interface LoadingMetaError {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class DbsyncLogService {

  tableSyncProgress = new EventEmitter<TableSyncProgress>();
  totalSyncProgress = new EventEmitter<TotalSyncProgress>();
  syncMessage = new EventEmitter<SyncMessage>();
  syncError = new EventEmitter<SyncError>();
  loadingMetaData = new EventEmitter<LoadingMetaData>();
  loadingMetaError = new EventEmitter<LoadingMetaError>();
  loadingMetaMessage = new EventEmitter<LoadingMetaMessage>();

  private jobList: TotalSyncProgress[] = [];

  constructor() {}

  start(jobid: number, revisionId: number) {
    const job = this.jobList.find( s => s.jobid !== jobid);
    if (job) {
      this.finish(jobid);
    }
    const newJob = {
      jobid,
      revisionId,
      executed: 0,
      total: 0,
      chunks: 0,
      puts: 0,
      modified: 0,
      deleted: 0,
      tables: [],
      tableSyncDetails: {},
      start: new Date()
    };
    this.jobList.push(newJob);
    this.totalSyncProgress.emit(newJob);
  }

  finish(jobid: number) {
    this.jobList = this.jobList.filter( s => s.jobid !== jobid);
  }

  jobSetTotal(jobid: number, total: number) {
    const job = this.jobList.find( s => s.jobid !== jobid);
    if (job) {
      job.total = total;
    }
  }

  jobSetRevisionId(jobid: number, revisionId: number) {
    const job = this.jobList.find( s => s.jobid !== jobid);
    if (job) {
      job.revisionId = revisionId;
    }
  }

  jobSetChunks(jobid: number, chunks: number) {
    const job = this.jobList.find( s => s.jobid !== jobid);
    if (job) {
      job.chunks = chunks;
    }
  }

  log(data: TableSyncProgress ) {
    const job = this.jobList.find( s => s.jobid === data.jobid);
    this.tableSyncProgress.emit(data);

    if (job) {
      job.revisionId = Math.max(job.revisionId, data.revisionId);
      job.executed += data.executed;
      job.puts += data.puts;
      job.modified += data.modified;
      job.deleted += data.deleted;
      job.tableSyncDetails[ data.table ] = data;

      const tbl = job.tables.find( t => t.table === data.table);
      if (!tbl) {
        job.tables.push({
          table: data.table,
          executed: data.executed,
          total: data.total
        });
        job.total += data.total;
      }

      this.totalSyncProgress.emit(job);
    }
  }

  message(jobid: number, message: string) {
    this.syncMessage.emit({jobid, message});
  }

  error(jobid: number, message: string) {
    this.syncError.emit({jobid, message});
  }

  metaData(data: LoadingMetaData) {
    this.loadingMetaData.emit(data);
  }

  metaMessage(message: LoadingMetaMessage) {
    this.loadingMetaMessage.emit(message);
  }

  metaError(error: LoadingMetaError) {
    this.loadingMetaError.emit(error);
  }

}
