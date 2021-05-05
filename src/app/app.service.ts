import {EventEmitter, Injectable, Output} from '@angular/core';
import {environment} from '../environments/environment';

export interface AppNewVersionFound {
  currentVersion?: string;
  newVersion: string;
  newInfo: string;
}
export interface AppUpdateFound {
  currentVersion?: string;
  updateInfo: string;
}
export interface AppDataUpdateFound {
  appData: any;
}

@Injectable({
  providedIn: 'root'
})
export class AppService {

  @Output() newVersionFound = new EventEmitter<AppNewVersionFound>();
  @Output() updateFound = new EventEmitter<AppUpdateFound>();
  @Output() availableUpdateDataFound = new EventEmitter<AppDataUpdateFound>();
  currentAppVersion = '';
  foundNewAppVersion = '';
  foundNewAppInfo = '';
  foundUpdateInfo = '';
  availableAppData: any;

  constructor() {
    this.currentAppVersion = environment.appVersion;
  }

  appIsUpToDate(reload: boolean = false) {
    this.foundNewAppVersion = '';
    this.foundNewAppInfo = '';
    this.foundUpdateInfo = '';
    return this;
  }

  setFoundNewVersion(version: string, info: string) {
    this.foundNewAppVersion = version;
    this.foundNewAppInfo = info;

    if (this.foundNewAppVersion !== this.currentAppVersion) {
      this.emitNewVersion();
    }
    return this;
  }

  setFoundUpdate(info: string) {
    this.foundUpdateInfo = info;

    this.updateFound.emit({
      currentVersion: this.currentAppVersion,
      updateInfo: this.foundUpdateInfo
    });
    return this;
  }

  setAvailableUpdate(appData: any) {
    this.availableAppData = appData;

    this.availableUpdateDataFound.emit({
      appData: this.availableAppData
    });
    return this;
  }

  private emitNewVersion() {
    this.newVersionFound.emit({
      currentVersion: this.currentAppVersion,
      newVersion: this.foundNewAppVersion,
      newInfo: this.foundNewAppInfo
    });
  }

  hasUpdate(): boolean {
    return (this.foundUpdateInfo !== ''
      && this.foundNewAppVersion !== ''
      && this.foundNewAppVersion !== this.currentAppVersion
    );
  }

  getNewUpdateInfo(): string {
    return this.foundUpdateInfo;
  }

  getNewAppVersion(): string {
    return this.foundNewAppVersion;
  }

  getNewAppInfo(): string {
    return this.foundNewAppInfo;
  }
}
