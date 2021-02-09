import {EventEmitter, Injectable, Output} from '@angular/core';
import {DBDIGebaeude, DBDIInventuren, DBDIJobLockStatus, DBDIMandanten, DBDIRaeume} from './dexie.interfaces';
import {User} from './auth/user.model';

type stringCallback = () => string;
@Injectable({
  providedIn: 'root'
})
export class BasedataService {

  @Output() userChanged = new EventEmitter<User>();
  @Output() mandantChanged = new EventEmitter<DBDIMandanten>();
  @Output() inventurChanged = new EventEmitter<DBDIInventuren>();
  @Output() gebaeudeChanged = new EventEmitter<DBDIGebaeude>();
  @Output() raumChanged = new EventEmitter<DBDIRaeume>();
  @Output() deviceChanged = new EventEmitter<number>();
  @Output() inventurStatusChanged = new EventEmitter<DBDIJobLockStatus>();
  @Output() apiBaseUrlChanged = new EventEmitter<string>();

  private currentMandant: DBDIMandanten;
  private currentInventur: DBDIInventuren;
  private currentGebaeude: DBDIGebaeude;
  private currentRaum: DBDIRaeume;
  private currentUser: User;
  private previousUser: User;
  private currentDevice: number;
  private currentInventurStatus: DBDIJobLockStatus;
  private currentApiBaseUrl: string;

  constructor() {
    this.currentMandant = JSON.parse( localStorage.getItem( 'currentMandant' ) );
    this.currentInventur = JSON.parse( localStorage.getItem( 'currentInventur' ) );
    this.currentUser = JSON.parse(localStorage.getItem('currentUser' ) );
    this.previousUser = JSON.parse(localStorage.getItem('previousUser' ) );
    this.currentGebaeude = JSON.parse( localStorage.getItem( 'currentGebaeude' ) );
    this.currentRaum = JSON.parse( localStorage.getItem( 'currentRaum' ) );
    this.currentDevice = JSON.parse( localStorage.getItem( 'currentDevice' ) );
    this.currentInventurStatus = JSON.parse( localStorage.getItem( 'currentInventurStatus' ) );
    this.currentApiBaseUrl = JSON.parse( localStorage.getItem( 'currentApiBaseUrl' ) );
  }

  setCurrentMandant(mandant: DBDIMandanten) {
    this.currentMandant = mandant;
    localStorage.setItem('currentMandant', JSON.stringify( mandant ) );
    this.mandantChanged.emit( this.currentMandant );
  }

  setCurrentInventur(inventur: DBDIInventuren) {
    this.currentInventur = inventur;
    localStorage.setItem('currentInventur', JSON.stringify( inventur ) );
    this.inventurChanged.emit( this.currentInventur );
  }

  setCurrentInventurStatus(inventurStatus: DBDIJobLockStatus) {
    this.currentInventurStatus = inventurStatus;
    localStorage.setItem('currentInventurStatus', JSON.stringify( inventurStatus ) );
    this.inventurStatusChanged.emit( this.currentInventurStatus );
  }

  setCurrentGebaeude(gebaeude: DBDIGebaeude) {
    this.currentGebaeude = gebaeude;
    localStorage.setItem('currentGebaeude', JSON.stringify( gebaeude ) );
    this.gebaeudeChanged.emit( this.currentGebaeude );
  }

  setCurrentRaum(raum: DBDIRaeume) {
    this.currentRaum = raum;
    localStorage.setItem('currentRaum', JSON.stringify( raum ) );
    this.raumChanged.emit( this.currentRaum );
  }

  setCurrentDevice(deviceid: number) {
    this.currentDevice = deviceid;
    localStorage.setItem('currentDevice', JSON.stringify( deviceid ) );
    this.deviceChanged.emit( this.currentDevice );
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify( user ) );
    this.userChanged.emit( this.currentUser );
  }

  setPreviousUser(user: User) {
    this.previousUser = user;
    localStorage.setItem('previousUser', JSON.stringify( user ) );
  }

  setCurrentApiBaseUrl(apiBaseUrl: string) {
    this.currentApiBaseUrl = apiBaseUrl;
    localStorage.setItem('currentApiBaseUrl', JSON.stringify( apiBaseUrl ) );
    this.apiBaseUrlChanged.emit( this.currentApiBaseUrl );
  }

  getCurrentDevice(): number {
    return this.currentDevice;
  }

  getCurrentDeviceId(): number {
    try {
      return this.currentDevice;
    } catch (e) {
      return 0;
    }
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  getPreviousUser(): User {
    return this.previousUser;
  }

  getPreviousUid(): number {
    try {
      return this.previousUser.id;
    } catch (e) {
      return 0;
    }
  }

  getCurrentUid(): number {
    try {
      return this.currentUser.id;
    } catch (e) {
      return 0;
    }
  }

  getCurrentMandant(): DBDIMandanten {
    return this.currentMandant;
  }

  getCurrentInventur(): DBDIInventuren {
    return this.currentInventur;
  }

  getCurrentInventurStatus(): DBDIJobLockStatus {
    return this.currentInventurStatus;
  }

  getCurrentJobid(): number {
    try {
      return this.currentInventur.jobid;
    } catch (e) {
      return 0;
    }
  }

  getCurrentMid(): number {
    try {
      return this.currentInventur.mid;
    } catch (e) {
      return 0;
    }
  }

  getCurrentGebaeude(): DBDIGebaeude {
    return this.currentGebaeude;
  }

  getCurrentGid(): number {
    try {
      return this.currentGebaeude.gid;
    } catch (e) {
      return 0;
    }
  }

  getCurrentRaum(): DBDIRaeume {
    return this.currentRaum;
  }

  getCurrentRuuid(): string {
    try {
      return this.currentRaum.uuid;
    } catch (e) {
      return '';
    }
  }

  getCurrentApiBaseUrl(): string {
    return this.currentApiBaseUrl;
  }

  getCurrentApiBaseUrlOrSetDefault(setter: stringCallback): string {
    if (!this.currentApiBaseUrl) {
      this.setCurrentApiBaseUrl(setter());
    }
    return this.currentApiBaseUrl;
  }
}
