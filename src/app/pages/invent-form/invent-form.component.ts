import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Location} from '@angular/common';
import {DataService, InventarData} from '../../shared/services/data.service';
import {
  DBDIArtikel,
  DBDIGebaeude,
  DBDIInventar, DBDIInventuren,
  DBDIJobLockStatus,
  DBDIMandanten, DBDIObjektKatalogImages,
  DBDIRaeume,
  DBDIRaumEditStatus,
  DBDIRaumGebaeude,
  IUnionLookupAssignedObject,
  LookupResultTable,
  LookupResultType
} from '../../shared/interfaces/dexie.interfaces';
import {
  faBarcode,
  faBookReader,
  faCamera,
  faCheck,
  faDoorClosed,
  faDoorOpen,
  faEdit,
  faImage,
  faLock,
  faSearch,
  faUnlockAlt
} from '@fortawesome/free-solid-svg-icons';
import {InventoryProgress, InventoryProgressService} from '../../shared/inventory-progress/inventory-progress.service';

import {ScanDetectData} from '../../shared/components/scannerdetection/scannerdetection.component';

import {ArtikelFormType} from './modals/select-create-artikel/select-create-artikel.component';

import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
// Dialogs
import {ScannerBarcodeData, ScannerComponent} from './modals/scanner/scanner.component';
import {CreateArtikelImageComponent} from './modals/create-artikel-image/create-artikel-image.component';
import {ShowArtikelImageComponent} from './modals/show-artikel-image/show-artikel-image.component';
import {SelectCreateArtikelComponent} from './modals/select-create-artikel/select-create-artikel.component';
import {
  ArtikelOption,
  SelectSearchArtikelComponent
} from './modals/select-search-artikel/select-search-artikel.component';
import {SelectCreateRaumComponent} from './modals/select-create-raum/select-create-raum.component';
import {RaumListRestComponent} from './modals/raum-list-rest/raum-list-rest.component';
import {RaumListDoneComponent} from './modals/raum-list-done/raum-list-done.component';
import {SelectSearchRaumComponent} from './modals/select-search-raum/select-search-raum.component';
import {BasedataService} from '../../shared/services/basedata.service';
import {InventoryEditorService} from '../../shared/services/inventory-editor.service';
import {
  InventarEditResult,
  InventarFoundResult,
  InventarInsertResult,
  InventarService
} from './data-services/inventar.service';
import {ImagesService} from './data-services/images.service';
import {BarcodeService} from './data-services/barcode.service';
import {RaumIDAndStatus, RaumImages, RaumService} from './data-services/raum.service';
import {GesamtListRestComponent} from './modals/gesamt-list-rest/gesamt-list-rest.component';
import {GesamtListDoneComponent} from './modals/gesamt-list-done/gesamt-list-done.component';
import {SoundsService} from '../../shared/services/sounds.service';
import {ToastrService} from 'ngx-toastr';
import {Subscription} from 'rxjs';
import {EditRaumComponent} from './modals/edit-raum/edit-raum.component';
import {VariablesService} from '../../shared/services/variables.service';
import {EditInventarComponent} from './modals/edit-inventar/edit-inventar.component';
import {DBInsertArtikelResult} from './data-services/artikel.service';
import {ImageboxComponent} from './modals/imagebox/imagebox.component';
import {ShowRaumImageComponent} from "./modals/show-raum-image/show-raum-image.component";
import {CreateRaumImageComponent} from "./modals/create-raum-image/create-raum-image.component";

interface ScannerConfiguration {
  minLength?: number; // 7
  maxLength?: number; //  14
  scannerStartsWith?: string; // '' - characters to trim before the code
  scannerEndsWith?: string; // '' - characters to trim after the code
  scanTimeout?: number; // 100 - timeout for detection in ms
  replaceNotNumber?: boolean; // true - allowes numbers only [0-9], replace everything else
  allowNotNumber?: boolean; // false  - allowes numbers only [0-9], replace everything else
  ignoreOverElement?: string[]; // ['INPUT'] - array of tag names that should disable emit
  barcodeType?: string; // ean13 - gtin[d] or ean[\]
}

interface RaumProgressStatus {
  hasTotal: boolean;
  total: number;
  numDone: number;
}

interface FormInventar {
  uuid?: string;
  mcid?: number;
  mcuuid?: string;
  gcid?: number;
  gcuuid?: string;
  ruuid?: string;
  Raum?: string;
  Raumbezeichnung?: string;
  RaumBarcode?: string;
  Barcode?: string;
  Bezeichnung?: string;
  Typ?: string;
}

interface CurrentModal {
  modalRef?: NgbModalRef;
  name: string;
  isOpen: boolean;
}

interface BCPartsObjektbuch {
  src: string;
  id: string;
  mid: string;
  hashStart: string;
}

interface BCPartsObjektbuchRaum extends BCPartsObjektbuch {
  gid: string;
}

interface BCPartsObjektbuchArtikel extends BCPartsObjektbuch {
  gcid: string;
}

interface BCLookupResult {
  barcode: string;
  expectedType: LookupResultType;
  bcParts?: BCPartsObjektbuchArtikel|BCPartsObjektbuchRaum;
  result: IUnionLookupAssignedObject;
}

@Component({
  selector: 'app-invent-form',
  templateUrl: './invent-form.component.html',
  styleUrls: ['./invent-form.component.scss']
})
export class InventFormComponent implements OnInit, OnDestroy {

  faBarcode = faBarcode;
  faSearch = faSearch;
  faCamera = faCamera;
  faEdit = faEdit;
  faImage = faImage;
  faCheck = faCheck;
  faDoorOpen = faDoorOpen;
  faDoorClosed = faDoorClosed;
  faBookReader = faBookReader;
  faLock = faLock;
  faUnlockAlt = faUnlockAlt;

  @ViewChild('input2', { static: true }) input2: ElementRef;
  @ViewChild('inputSimulateBarcode', { static: true }) inputSimulateBarcode: ElementRef;

  scanDetectorConfig: ScannerConfiguration = {
    minLength: 5,
    maxLength: 30,
    scannerStartsWith: '',
    scannerEndsWith: '', // {scannerEndsWith: 'Enter'}
    scanTimeout: 100,
    replaceNotNumber: false,
    allowNotNumber: true,
    ignoreOverElement: [ '.formcontrol-edit-barcode'],
    barcodeType: ''
  };

  public formInventar: FormInventar = {
    uuid: null,
    mcid: null,
    mcuuid: null,
    gcid: null,
    gcuuid: null,
    ruuid: null,
    Raum: null,
    Raumbezeichnung: null,
    RaumBarcode: null,
    Barcode: '',
    Bezeichnung: '',
    Typ: '',
  };

  public jobid: number;
  public inventur: DBDIInventuren;
  public kunde?: DBDIMandanten;
  public gebaeude?: DBDIGebaeude;
  public raum?: DBDIRaeume;
  public inventarData?: InventarData;

  private clientID: number;
  private buildingID: number;
  private roomUuiD?: string;
  private artikelUuiD?: string;
  private routingSubscription: Subscription;
  private raumStatusChangeSubscription: Subscription;
  private inventarDataChangeSubscription: Subscription;
  private inventurLockStatusChangeSubscription: Subscription;
  private unsyncedAmountChangeSubscription: Subscription;

  public lastScanDetectTime?: Date;
  public lastScanDetectClass = '';
  private lastScanDetectTimer = null;
  waitingForNewInventarBarcode = false;
  waitingForInventarData = false;
  private openedCreateRaum = false;
  artikelImageExists = false;
  public allowNewInventarByGivenArticle = false;

  jobProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  numUnsynced = -1;

  raumEditStatus: DBDIRaumEditStatus;
  raumBilder: RaumImages[] = [];
  raumPlaene: RaumImages[] = [];

  jobLockStatus: DBDIJobLockStatus = DBDIJobLockStatus.Init;

  raumProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  private currentModal: CurrentModal = {
    modalRef: null,
    isOpen: false,
    name: ''
  };

  private currentModals: CurrentModal[] = [];

  blobAlert?: string;
  private blobAlertSuccess = 'success';
  private blobAlertFailure = 'danger';
  private blobAlertOff = null;
  private blobAlertTimer = null;
  private varChangeSubscription: Subscription = null;
  manualBCInputEnabled: boolean;
  useOverlay = 0;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private dataService: DataService,
    private modalService: NgbModal,
    private baseData: BasedataService,
    private inventoryProgress: InventoryProgressService,
    private inventoryEditor: InventoryEditorService,
    private inventarDataService: InventarService,
    private raumService: RaumService,
    private imageService: ImagesService,
    private bcLookup: BarcodeService,
    private sounds: SoundsService,
    private variables: VariablesService,
    private toastr: ToastrService) {
  }

  showBlobAlertSuccess() {
    this.showBlobAlert('success');
  }

  showBlobAlertError() {
    this.showBlobAlert('danger');
  }

  showBlobAlert(alertType: string) {
    this.useOverlay = this.useOverlay < 2 ? this.useOverlay + 1 : 1;
    this.blobAlert = null;
    if (this.blobAlertTimer) {
      clearTimeout( this.blobAlertTimer );
    }
    this.blobAlert = alertType;
    this.blobAlertTimer = setTimeout(
      () => {
        this.blobAlert = null;
        this.useOverlay = 0;
      },
      1200
    );
  }

  ngOnInit() {
    this.inventoryProgress.getCurrentInventurLockStatus().then( (status) => {
      this.jobLockStatus = status;
    });

    this.unsyncedAmountChangeSubscription = this.dataService.clientSyncAmountChanged
      .subscribe( (amount) => {
        this.numUnsynced = amount;
    });

    this.inventurLockStatusChangeSubscription = this.inventoryProgress.inventurLockStatusChanged
      .subscribe((status) => {
        this.jobLockStatus = status;
    });

    this.raumStatusChangeSubscription = this.raumService.raumStatusChanged
      .subscribe( (stat: RaumIDAndStatus) => {
      if (stat.uuid === this.roomUuiD) {
        this.raumEditStatus = stat.status;
      }
    });

    console.log('this.inventarDataService.changed', this.inventarDataService.changed);
    this.inventarDataChangeSubscription = this.inventarDataService
      .changed.subscribe( (change) => {
        this.refreshRaumProgress();
    });

    this.routingSubscription = this.route.params.subscribe(params => {
      this.clientID = parseInt( params.clientid,  10 );
      this.buildingID = parseInt( params.buildingid, 10 );
      const roomUUID = params.roomid;

      this.dataService.getClient( this.clientID ).then( (clnt) => {
        this.kunde = clnt;
        this.baseData.setCurrentMandant( this.kunde );
      });

      this.dataService.getBuilding( this.buildingID, this.clientID ).then( (bldg) => {
        this.gebaeude = bldg;
      });

      if (roomUUID) {
        this.loadRaumById( roomUUID );
      } else {
        const lastSelectedRoom = this.baseData.getCurrentRaum();
        if (lastSelectedRoom && lastSelectedRoom.gid === this.buildingID) {
          this.loadRaumByData( lastSelectedRoom );
        }
      }
      console.log({params, kunde: this.kunde, gebaeude: this.gebaeude });
      this.refreshInventoryProgress();
    });
    this.jobid = this.baseData.getCurrentJobid();
    this.inventur = this.baseData.getCurrentInventur();

    this.variables.get('manualBarcodeInput', false).then( (status) => {
      this.manualBCInputEnabled = status;
    });

    this.variables.watch('manualBarcodeInput');
    this.varChangeSubscription = this.variables.varChanged.subscribe( (setting) => {
      if (setting.name === 'manualBarcodeInput') {
        this.manualBCInputEnabled = setting.newValue;
      }
    });
  }

  loadRaumById( roomUuid: string) {
    this.dataService.getRaum( roomUuid )
      .then( (raum: DBDIRaumGebaeude) => {
        console.log('InventFormComponente #338 Retrieved Raum by roomUuid', {raum, roomUuid});
        this.loadRaumByData(raum);
      });
  }

  loadRaumByData(raum: DBDIRaeume) {
    const url = '/form-inventory/' + this.clientID + '/' + this.buildingID + '/' + raum.uuid;
    console.log('InventFormComponente #345 Change URL ', { raum, url });
    this.location.go( url);
    this.roomUuiD = raum.uuid;
    this.raum = raum;
    this.baseData.setCurrentRaum( this.raum );
    this.formInventar.ruuid = raum.uuid;
    this.formInventar.Raum = raum.Raum;
    this.formInventar.Raumbezeichnung = raum.Raumbezeichnung;
    this.formInventar.RaumBarcode = raum.code;
    this.clearFormInventar();
    this.raumEditStatus = this.raum.current_jobstatus;
    this.raumBilder = [];
    this.raumPlaene = [];
    this.raumService.getRaumBilder(this.raum.uuid).then( (images) => {
      console.log('InventFormComponent.raumService.getRaumBilder #376 images: ', images);
      this.raumBilder = images;
    });
    this.raumService.getRaumPlaene(this.raum.uuid).then( (images) => {
      console.log('InventFormComponent.raumService.getRaumPlaene #376 images: ', images);
      this.raumPlaene = images;
    });
    console.log('InventFormComponente #356  loadRaumByData refreshRaumProgress');



    this.refreshRaumProgress();
  }

  clearFormInventar() {
    this.waitingForNewInventarBarcode = false;
    this.waitingForInventarData = false;

    this.inventarData = null;
    this.artikelUuiD = null;

    this.formInventar.uuid = '';
    this.formInventar.mcid = 0;
    this.formInventar.mcuuid = '';
    this.formInventar.gcid = 0;
    this.formInventar.gcuuid = '';
    this.formInventar.Barcode = '';
    this.formInventar.Bezeichnung = '';
    this.formInventar.Typ = '';
    this.artikelImageExists = false;
  }

  clearFormRaum() {
    this.formInventar.ruuid = '';
    this.formInventar.Raum = '';
    this.formInventar.Raumbezeichnung = '';
    this.formInventar.RaumBarcode = '';
  }

  async assignInventarToRaum(inventarData: InventarData) {
    console.log('InventFormComponente #350 assignInventarToRaum(inventarData)', { inventarData });
    this.loadInventarByData( inventarData );
    this.inventarDataService.assignRaum(inventarData.inventar.uuid, this.roomUuiD)
      .then( (rslt) => {
        console.log('InventFormComponente #387 Inventar wurde dem Raum zugewiesen!', { rslt });
      })
      .catch( (err) => {
        console.error('InventFormComponente #390 Inventar konnte nicht zugewiesen werden!', err);
      });
  }

  async saveNewInventar(): Promise<InventarInsertResult> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const inventar: DBDIInventar = {
      mcid: this.formInventar.mcid,
      mcuuid: this.formInventar.mcuuid,
      ruuid: this.formInventar.ruuid,
      code: this.formInventar.Barcode,
      jobid,
      created_at: new Date(),
      created_uid: uid
    };

    const inserting = this.inventarDataService.insertInventar(inventar, jobid);

    inserting.then( (result) => {
      if (result.success) {
        console.log('InventFormComponente #409 Inventar wurde hinzugefügt', result);
        this.loadInventarByUuid(result.insertUUID);
      } else {
        console.error('InventFormComponent #424 Inventar konnte nicht hinzugefügt werden', { result });
      }
      })
      .catch( (err) => {
        console.error('InventFormComponente #413 Fehler beim Speichern neuer Inventar-Daten', { err });
      });
    return inserting;
  }

  async updateInventarArtikelRef(): Promise<InventarEditResult> {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const uuid = this.formInventar.uuid;
    const inventar: DBDIInventar = {
      mcid: this.formInventar.mcid,
      mcuuid: this.formInventar.mcuuid,
      ruuid: this.formInventar.ruuid,
      code: this.formInventar.Barcode,
      jobid,
      modified_at: new Date(),
      modified_uid: uid
    };

    return this.inventarDataService.updateArtikelRef(uuid, inventar, jobid);
  }

  async refreshInventoryProgress() {

    return Promise.all([
      this.refreshRaumProgress(),
      this.refreshGebaeudeProgress()
    ]).then( () =>  {
      console.log('InventFormComponente #425 Fortschritt für Gebaeude und Raum wurde aktualisiert');
      return true;
    }).catch( (err) => {
      console.error('InventFormComponente #428Beim Aktualisieren des Fortschritts von Gebaeude und Raum ist ein Fehler aufgetreten');
      return false;
    });
  }

  async refreshGebaeudeProgress() {

    this.inventoryProgress.getCurrentGebaeudeProgress().then( (progress: InventoryProgress) => {
      this.jobProgress.done = progress.done;
      this.jobProgress.total = progress.total;
    });
  }

  async refreshRaumProgress() {

    this.inventoryProgress.getCurrentRaumProgress(this.roomUuiD)
      .then( (progress: InventoryProgress) => {
        this.raumProgress.done = progress.done;
        this.raumProgress.total = progress.total;
      })
      .catch( err => {
        console.error( 'InventFormComponente #449 Fehler bei Raum-Progress-Aktualisierung', err );
      });
  }

  loadArtikelByUuid(artikelUuid: string) {
    this.dataService.getArtikel( artikelUuid )
      .then( item => {
        this.loadArtikelByData( item );
      });
  }

  async loadArtikelByData(artikel: DBDIArtikel): Promise<boolean> {
    this.artikelUuiD = artikel.uuid;
    this.formInventar.mcid = artikel.mcid;
    this.formInventar.mcuuid = artikel.mcuuid;
    this.formInventar.gcid = artikel.gcid;
    this.formInventar.gcuuid = artikel.uuid;
    this.formInventar.Bezeichnung = artikel.Bezeichnung;
    this.formInventar.Typ = artikel.Typ;

    console.log('InventFormComponent #475 loadArtikelByData', {
      artikel: {...artikel},
      formInventar: {...this.formInventar},
      waitingForInventarData: this.waitingForInventarData,
      waitingForNewInventarBarcode: this.waitingForNewInventarBarcode
    });

    if (this.allowNewInventarByGivenArticle) {
      if (!this.waitingForInventarData && this.formInventar.Barcode.length > 1) {
        this.formInventar.Barcode = '';
        console.log('InventFormComponent #479 set waitingForNewInventarBarcode = true');
        this.waitingForNewInventarBarcode = true;
      }
    }

    const tmp = {...this.formInventar};
    this.formInventar = {...tmp};

    if (!this.formInventar.uuid && this.waitingForInventarData) {
      console.log('InventFormComponente #480 call this.saveNewInventar() from this.loadArtikelByData(...)');
      const insertResult = await this.saveNewInventar();
      if (insertResult && insertResult.success) {
        this.waitingForInventarData = false;
        this.toastr.success('Neues Inventar-Objekt wurde hinzugefügt!', 'Neuaufnahme gespeichert');
      } else {
        this.toastr.error('Neues Inventar-Objekt konnte nicht hinzugefügt werden!', 'Fehler bei Neuaufnahme');
        return false;
      }
    }


    if (this.formInventar.uuid) {
      const bConfirmUpdate = confirm('Möchten Sie die Inventardaten wirklich ändern!\n' +
      'Dem Objekt wurden bereits Artikeldaten zugewiesen.\n' +
      'Drücken Sie [OK] zur Bestätigung\n' +
      'oder auf [Abbrechen]!');
      if (bConfirmUpdate) {
        const updateResult = await this.updateInventarArtikelRef();
        if (updateResult && updateResult.success) {
          this.toastr.success('Inventar wurde mit neuen Artikeldaten gespeichert', 'Erfolgreiche Artikelzuweisung');
        } else {
          this.toastr.error('Inventar konnte nicht aktualisiert werden!', 'Fehler bei Artikelzuweisung');
          return false;
        }
      }
    }

    console.log('InventFormComponente #487 loadArtikelByData', { waitingForNewInventarBarcode: this.waitingForNewInventarBarcode });
    console.log('InventFormComponente #488Applied argument artikel', artikel, ' to formInventar', this.formInventar);
    this.reloadImageExistsStatus();
    return true;
  }

  loadInventarByUuid(uuid: string) {
    this.dataService.getInventarData(uuid).then(result => {
      console.log('InventFormComponente #494 loadInventarById(uuid)', { uuid });
      this.loadInventarByData( result.inventarData );
    });
  }

  loadInventarByData(inventarData: InventarData) {
    const inventar = inventarData.inventar;
    const artikelRef = inventarData.artikelRef;
    const artikelData = inventarData.artikelData;
    console.log('InventFormComponente #503 loadInventarByData(inventarData)', { inventarData });

    this.inventarData = inventarData;
    this.artikelUuiD = inventar.mcuuid;
    this.formInventar.mcid = inventar.mcid;
    this.formInventar.gcid = artikelRef ? artikelRef.gcid : 0;
    this.formInventar.mcuuid = artikelRef.uuid;
    this.formInventar.gcuuid = artikelData.uuid;
    this.formInventar.Bezeichnung = artikelData.Bezeichnung;
    this.formInventar.Typ = artikelData.Typ;
    this.formInventar.Barcode = inventar.code;
    this.formInventar.uuid = inventar.uuid;

    this.reloadImageExistsStatus();
  }

  async reloadImageExistsStatus(): Promise<boolean> {
    this.artikelImageExists = false;
    if (!this.formInventar.gcuuid) {
      return false;
    }
    return this.imageService.imageExistsOfGcuuid( this.formInventar.gcuuid )
      .then( exists => {
        this.artikelImageExists = exists;
        return exists;
      })
      .catch( () => false);
  }

  get kundeName(): string {
    return this.kunde ? this.kunde.Mandant : '';
  }

  get adresse(): string {
    return this.gebaeude ? this.gebaeude.Gebaeude : '';
  }

  get raumNr(): string {
    return this.raum ? this.raum.Raum : '';
  }

  createKunstwerk() {
    // YYYYMMDDHHMMSS
    // Fantasy Barcode: 9{MID}{DEVID}
    this.inventarDataService.getNewKunstBarcode().then( (kBarcode) => {
      this.clearFormInventar();
      this.formInventar.Barcode = kBarcode;
      this.waitingForInventarData = true;
      const modalCreateArtikel = this.openSelectCreateArtikel();
      modalCreateArtikel.setFormType(ArtikelFormType.Kunst);
    });
  }

  get gebaeudeId() { return this.buildingID; }

  openRaumbild(idx: number) {
    if (false) {
      const imgUuids = this.raumBilder.map( (itm) => itm.uuid);
      const modalRef = this.modalService.open(ShowRaumImageComponent, {size: 'xl'});
      console.log('openRaumplan', { raumBilder: this.raumBilder, imgUuids, idx });
      this.modalWatch(modalRef, 'ShowRaumImage');
      modalRef.componentInstance.setTitel('Raumbilder');
      modalRef.componentInstance.setImageUuid(imgUuids[idx]);
    } else {
      const imgUuids = this.raumBilder.map( (itm) => itm.uuid);
      const modalRef = this.modalService.open(ImageboxComponent, {size: 'xl'});
      console.log('openRaumplan', { raumBilder: this.raumBilder, imgUuids, idx });
      this.modalWatch(modalRef, 'Imagebox');
      modalRef.componentInstance.setTitel('Raumbilder');
      modalRef.componentInstance.setImagesUuids(imgUuids, idx);
    }
  }

  openRaumplan(idx: number) {
    if (false) {
      const imgUuids = this.raumPlaene.map((itm) => itm.uuid);
      const modalRef = this.modalService.open(ShowRaumImageComponent, {size: 'xl'});
      console.log('openRaumplan', {raumPlaene: this.raumPlaene, imgUuids, idx});
      this.modalWatch(modalRef, 'ShowRaumImage');
      modalRef.componentInstance.setTitel('Raumpläne');
      modalRef.componentInstance.setImageUuid(imgUuids[idx]);
    } else {
      const imgUuids = this.raumPlaene.map( (itm) => itm.uuid);
      const modalRef = this.modalService.open(ImageboxComponent, {size: 'xl'});
      console.log('openRaumplan', { raumPlaene: this.raumPlaene, imgUuids, idx });
      this.modalWatch(modalRef, 'Imagebox');
      modalRef.componentInstance.setTitel('Raumpläne');
      modalRef.componentInstance.setImagesUuids(imgUuids, idx);
    }
  }

  openCreateArtikelImage() {
    const modalRef = this.modalService.open(CreateArtikelImageComponent);
    this.modalWatch(modalRef, 'CreateArtikelImage');
    modalRef.componentInstance.name = this.formInventar.Bezeichnung + '/' + this.formInventar.Typ;
    modalRef.componentInstance.gcuuid = this.formInventar.gcuuid;
    modalRef.componentInstance.setMetaData({
      for_jobid: this.jobid,
      mcuuid: this.formInventar.mcuuid,
      gcuuid: this.formInventar.gcuuid,
      name: this.formInventar.Bezeichnung + (this.formInventar.Typ ? '-' + this.formInventar.Typ : ''),
      desc: this.formInventar.Bezeichnung + (this.formInventar.Typ ? ' / ' + this.formInventar.Typ : '')
    });
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openCreateRaumImage() {

    const rb = this.formInventar.Raumbezeichnung;
    const rm = this.formInventar.Raum;
    let name = '';
    if (rm) {
      name = rm.split('/').join('.').split(' ').join('_');
    } else {
      name = rb.split('/').join('.').split(' ').join('_');
    }
    const modalRef = this.modalService.open(CreateRaumImageComponent);
    this.modalWatch(modalRef, 'CreateArtikelImage');
    modalRef.componentInstance.name = this.formInventar.Bezeichnung + '/' + this.formInventar.Typ;
    modalRef.componentInstance.gcuuid = this.formInventar.gcuuid;
    modalRef.componentInstance.setMetaData({
      for_jobid: this.jobid,
      ruuid: this.formInventar.ruuid,
      name,
      desc: rb
    });
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openEditArtikelImage() {
    const modalRef = this.modalService.open(CreateArtikelImageComponent);
    this.modalWatch(modalRef, 'CreateArtikelImage');
    modalRef.componentInstance.name = this.formInventar.Bezeichnung + '/' + this.formInventar.Typ;
    modalRef.componentInstance.setMetaData({
      mcuuid: this.formInventar.mcuuid,
      gcuuid: this.formInventar.gcuuid,
      for_jobid: this.jobid,
      name: this.formInventar.Bezeichnung,
      desc: this.formInventar.Bezeichnung
    });
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openShowArtikelImage() {
    const modalRef = this.modalService.open(ShowArtikelImageComponent);
    this.modalWatch(modalRef, 'ShowArtikelImage');
    modalRef.componentInstance.name = 'World';
    console.log('openShowArtikelImage #642 setMcuuid: ', this.formInventar.mcuuid);
    modalRef.componentInstance.setMcuuid( this.formInventar.mcuuid, this.formInventar.gcuuid );
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openScanner(inputElm?: HTMLElement) {
    const modalRef = this.modalService.open(ScannerComponent);
    this.modalWatch(modalRef, 'Scanner');
    modalRef.componentInstance.name = 'World';
    const sub = modalRef.componentInstance.onScan.subscribe((data: ScannerBarcodeData) => {
      const scan: ScanDetectData = {
        barcode: data.barcode,
        length: data.length,
        valid: data.valid,
        target: inputElm
      };
      modalRef.close();
      console.log('InventFormComponente #588 call handleScanData', { data, scan });
      this.handleScanData( scan );
    });
  }

  getModalRefByName(name: string): NgbModalRef {
    const modal = this.currentModals.find( mod => mod.name === name);
    return (modal && modal.modalRef.componentInstance) ? modal.modalRef : null;
  }

  closeModalIfOpen(name: string): boolean {
    const modal = this.currentModals.find( mod => mod.name === name);
    if (modal && modal.modalRef.componentInstance) {
      modal.modalRef.close();
      return true;
    }
    return false;
  }

  modalWatch(modalRef: NgbModalRef, name: string) {
    const mRef = modalRef;
    const mName = name;
    console.log('InventFormComponente #610 Opened Modal: ', name);
    const currModal = {
      modalRef,
      name,
      isOpen: true
    };
    this.currentModal = currModal;
    this.currentModals = this.currentModals.filter( mod => undefined !== mod.modalRef.componentInstance);
    this.currentModals.push( currModal );
    console.log('InventFormComponente #618 After open Modal: ', this.currentModal, this.currentModals);

    modalRef.result.then( (result) => {
      if (name === 'SelectCreateRaum') {
        this.openedCreateRaum = false;
      }
      this.currentModals = this.currentModals.filter( mod => undefined !== mod.modalRef.componentInstance);

      if (this.currentModals.length) {
        this.currentModal = this.currentModals[ this.currentModals.length - 1];
      } else {
        this.currentModal = {
          modalRef: null,
          name: '',
          isOpen: false
        };
      }
      console.log('InventFormComponente #635 After dismiss resolved: ', this.currentModal, this.currentModals);
    })
      .catch( (err) => {
        if (name === 'SelectCreateRaum') {
          this.openedCreateRaum = false;
        }
        this.currentModals = this.currentModals.filter( mod => undefined !== mod.modalRef.componentInstance);
        console.error('InventFormComponente #642 Error on Closing Modal ', { mName, err} );
        if (this.currentModals.length) {
          this.currentModal = this.currentModals[ this.currentModals.length - 1];
        } else {
          this.currentModal = {
            modalRef: null,
            name: '',
            isOpen: false
          };
        }
        console.log('InventFormComponente #652 After Catch: ', this.currentModal, this.currentModals);
      });
  }

  openSelectCreateArtikel(settings: any = null): SelectCreateArtikelComponent {
    const modalRef = this.modalService.open(SelectCreateArtikelComponent);
    this.modalWatch(modalRef, 'SelectCreateArtikel');
    modalRef.componentInstance.name = 'World';
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelCreated.subscribe( (artikel: DBInsertArtikelResult) => {
      this.loadArtikelByData( artikel.newItem );
    });
    modalRef.componentInstance.artikelSelected.subscribe((item: ArtikelOption) => {
      console.log('InventFormComponente #665 openSelectCreateArtikel Apply selected Article', item);
      this.loadArtikelByUuid(item.uuid);
    });
    modalRef.componentInstance.artikelSearching.subscribe( (raum: number) => {
      this.openSelectSearchArtikel();
    });

    return modalRef.componentInstance;
  }

  openSelectSearchArtikel() {
    const modalRef = this.modalService.open(SelectSearchArtikelComponent);
    this.modalWatch(modalRef, 'SelectSearchArtikel');
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelSelected.subscribe((item: ArtikelOption) => {
      console.log('InventFormComponente #678 Apply selected Article', item);
      this.loadArtikelByUuid(item.uuid);
    });
    modalRef.componentInstance.artikelCreating.subscribe((mid: number) => {
      modalRef.close();
      this.openSelectCreateArtikel();
    });
  }

  openSelectSearchRaum() {
    const modalRef = this.modalService.open(SelectSearchRaumComponent);
    this.modalWatch(modalRef, 'SelectSearchRaum');
    modalRef.componentInstance.gebaeudeId = this.buildingID;
    modalRef.componentInstance.raumSelected.subscribe( (raum: DBDIRaeume) => {
      this.loadRaumByData(raum);
    });
    modalRef.componentInstance.raumCreating.subscribe( (gid: number) => {
      modalRef.close();
      this.openSelectCreateRaum();
    });
  }

  openEditRaum() {
    const modalRef = this.modalService.open(EditRaumComponent);
    this.modalWatch(modalRef, 'EditRaum');
    modalRef.componentInstance.raumUuid = this.roomUuiD;
    modalRef.componentInstance.raumChanged.subscribe( (raum: DBDIRaeume) => {
      this.loadRaumByData(raum);
    });
    modalRef.componentInstance.scannerRequest.subscribe( (target: HTMLElement) => {
      this.openScanner(target);
    });
  }

  openEditInventar() {
    const modalRef = this.modalService.open(EditInventarComponent);
    this.modalWatch(modalRef, 'EditInventar');
    console.log('InventFormComponente #715 this.inventarData ' + this.inventarData.inventar.uuid);
    modalRef.componentInstance.inventarUuid = this.inventarData.inventar.uuid;
    modalRef.componentInstance.inventarChanged.subscribe( (inventar: InventarFoundResult) => {
      console.log('InventFormComponente #718 Aktualisierte Inventar-Daten', { inventar });
      this.toastr.success('Inventardaten wurden aktualisiert!');
      this.loadInventarByUuid(inventar.inventar.uuid);
    });
    modalRef.componentInstance.scannerRequest.subscribe( (target: HTMLElement) => {
      this.openScanner(target);
    });
  }

  openSelectCreateRaum() {
    const modalRef = this.modalService.open(SelectCreateRaumComponent);
    this.modalWatch(modalRef, 'SelectCreateRaum');
    this.openedCreateRaum = true;
    modalRef.componentInstance.gebaeudeId = this.buildingID;
    modalRef.componentInstance.raumCreated.subscribe( (raum: DBDIRaeume) => {
      this.loadRaumByData(raum);
    });
    modalRef.componentInstance.raumSearching.subscribe( () => {
      this.openSelectSearchRaum();
    });
    modalRef.componentInstance.scannerRequest.subscribe( (target: HTMLElement) => {
      this.openScanner(target);
    });
  }

  openGesamtListDone(useGebaeude?: DBDIGebaeude) {
    const gebaeude = useGebaeude || this.gebaeude;
    const modalRef = this.modalService.open( GesamtListDoneComponent, { size: 'xl', scrollable: true } );
    this.modalWatch(modalRef, 'GesamtListDone');
    modalRef.componentInstance.gebaeude = gebaeude;
    modalRef.componentInstance.raumSelected.subscribe( (ruuid: string) => {
      this.loadRaumById(ruuid);
    });
    modalRef.componentInstance.requestGesamtRest.subscribe( (g: DBDIGebaeude) => {
      this.openGesamtListRest(g);
    });
  }

  openGesamtListRest(useGebaeude?: DBDIGebaeude) {
    const gebaeude = useGebaeude || this.gebaeude;
    if (!gebaeude || !gebaeude.gid) {
      console.error('InventFormComponente #759 No Gebaeude-Data!!!');
    } else {
      console.log('InventFormComponente #761 OpenGesamtListRest', {
        buildingID: this.buildingID,
        gebaeude: this.gebaeude
      });
    }
    const modalRef = this.modalService.open( GesamtListRestComponent );
    this.modalWatch(modalRef, 'GesamtListRest');
    modalRef.componentInstance.gebaeude = gebaeude;
    modalRef.componentInstance.raumSelected.subscribe( (ruuid: string) => {
      this.loadRaumById(ruuid);
    });
    modalRef.componentInstance.requestGesamtDone.subscribe( (g: DBDIGebaeude) => {
      this.openGesamtListDone(g);
    });
  }

  openRaumListDone(useRaum?: DBDIRaeume) {
    const raum = useRaum || this.raum;
    const modalRef = this.modalService.open( RaumListDoneComponent );
    this.modalWatch(modalRef, 'RaumListDone');
    modalRef.componentInstance.raum = raum;
    modalRef.componentInstance.requestRestList.subscribe( (r: DBDIRaeume) => {
      this.openRaumListRest(r);
    });
  }

  openRaumListRest(useRaum?: DBDIRaeume) {
    const raum = useRaum || this.raum;
    const modalRef = this.modalService.open( RaumListRestComponent );
    this.modalWatch(modalRef, 'RaumListRest');
    modalRef.componentInstance.raum = raum;
    modalRef.componentInstance.requestDoneList.subscribe( (r: DBDIRaeume) => {
      this.openRaumListDone(r);
    });
  }

  ngOnDestroy(): void {
    this.routingSubscription.unsubscribe();
    this.raumStatusChangeSubscription.unsubscribe();
    this.inventarDataChangeSubscription.unsubscribe();
    this.inventurLockStatusChangeSubscription.unsubscribe();
  }

  toggleRaumEditStatus() {
    const jobid = this.baseData.getCurrentJobid();
    if (this.raumEditStatus !== DBDIRaumEditStatus.Closed) {
      this.raumService.setRaumStatusClosed(this.roomUuiD, jobid);
    } else {
      this.raumService.setRaumStatusStarted(this.roomUuiD, jobid);
    }
  }

  setJobLockStatusClosed() {
    this.inventoryProgress.setCurrentInventurLockStatusClosed();
  }

  setJobLockStatusOpened() {
    this.inventoryProgress.setCurrentInventurLockStatusOpened();
  }

  setRaumEditStatusClosed() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusClosed(this.roomUuiD, jobid);
  }

  setRaumEditStatusStarted() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusStarted(this.roomUuiD, jobid);
  }

  setRaumEditStatusUntouched() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusInit(this.roomUuiD, jobid);
  }

  onRaumBarcodeInput(event: Event): void {
    if (event.target instanceof HTMLInputElement || 'value' in event.target ) {
      console.log('InventFormComponente #838 BarCodeInput :', event.target.value );
    }
  }

  showGesamtDone(): void {
    console.log('InventFormComponente #843 Called show Gesamt Done');
    this.openGesamtListDone();
  }

  showGesamtRest(): void {
    console.log('InventFormComponente #848 Called show Gesamt Rest');
    this.openGesamtListRest();
  }

  showRaumDone(): void {
    console.log('InventFormComponente #853 Called show Raum Done ...');
    this.openRaumListDone();
  }

  showRaumRest(): void {
    console.log('InventFormComponente #858 Called show Raum Rest');
    this.openRaumListRest();
  }

  onBarcodeInput(): void {}

  async handleScanData(event: ScanDetectData) {
    console.log('InventFormComponente #865 handleScanData', { waitingForNewInventarBarcode: this.waitingForNewInventarBarcode, event });
    const bcResult = await this.bcLookup.fullLookup(event.barcode, this.jobid);
    console.log('InventFormComponente #867 handleScanData', { bcResult });
    const barcode = event.barcode;

    this.displayScannedBarcode(event.barcode);

    const RaumCreateModal = this.getModalRefByName('SelectCreateRaum');
    const RaumEditModal = this.getModalRefByName('EditRaum');
    const InventarEditModal = this.getModalRefByName('EditInventar');

    if (RaumCreateModal && RaumCreateModal.componentInstance) {
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        const modalComp: SelectCreateRaumComponent = RaumCreateModal.componentInstance;
        // alert('transfer Code to Input SelectCreateRaumComponentraumDaten.code!');
        modalComp.raumDaten.code = bcResult.barcode;
        this.playSuccess();
        return true;
      } else {
        this.playError();
        this.toastr.error(
          'Gebe einen gülten Barcode ein oder schließe den Dialog "Neuen Raum anlegen"!' +
          '<br>' + barcode,
          'Ungültiger Barcode für Raum-Neu-Erfassung:'
        );
        return false;
      }
    }

    if (RaumEditModal && RaumEditModal.componentInstance) {
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        const modalComp: EditRaumComponent = RaumEditModal.componentInstance;
        // alert('transfer Code to Input EditRaumComponent.raumInput.code!');
        if (confirm('Achtung! Möchtest du wirklich den Raumbarcode bearbeiten?')) {
          modalComp.raumInput.code = bcResult.barcode;
          this.playSuccess();
        }
        return true;
      } else {
        this.playError();
        this.toastr.error(
          'Gebe einen gülten Barcode ein oder schließe den Dialog "Raum aktualisieren"!' +
          '<br>' + barcode + ' [' + LookupResultTable[bcResult.lookupResultTable] + ']',
          'Ungültiger Barcode für Raum-Aktualisierung'
        );
        return false;
      }
    }

    if (InventarEditModal && InventarEditModal.componentInstance) {
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        const modalComp: EditInventarComponent = InventarEditModal.componentInstance;
        // alert('transfer Code to Input EditRaumComponent.raumInput.code!');
        modalComp.inventarInput.code = bcResult.barcode;
        this.playSuccess();
        return true;
      } else {
        this.playError();
        this.toastr.error(
          'Gebe einen gülten Barcode ein oder schließe den Dialog "Barcode aktualisieren"!' +
          '<br>' + barcode,
          'Ungültiger Barcode für Inventar-Aktualisierung'
        );
        return false;
      }
    }

    if (this.waitingForNewInventarBarcode) {
      console.log('InventFormComponente #949 handleScanData');
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        this.formInventar.Barcode = bcResult.barcode;
        console.log('InventFormComponente #952 handleScanData');
        console.log('InventFormComponente #953 call this.saveNewInventar() from this.handleScanData');
        this.waitingForNewInventarBarcode = false;
        const insertResult = await this.saveNewInventar();
        if (insertResult && insertResult.success) {
          this.playSuccess();
        } else {
          this.playError();
        }
        return true;
      } else {
        this.playError();
        console.log('InventFormComponente #960 handleScanData');
        if (confirm('Barcode ist bereits vergeben!\n' +
          'Drücken Sie [Abbrechen], um die Neuaufnahme abzubrechen!\n' +
          'Drücken Sie [OK], wenn Sie einen neuen Barcode vergeben wollen.')) {
          return;
        } else {
          this.waitingForNewInventarBarcode = false;
        }
      }
    }

    console.log('InventFormComponente #972 handleScanData');
    if (this.waitingForInventarData) {
      if (bcResult.lookupResultTable !== LookupResultTable.ObjektKatalogMandant) {
        this.playError();
        if (confirm('Fehler: Erwarte Artikel-Barcode!\n' +
          'Drücken Sie [Abbrechen], um die Neuaufnahme abzubrechen!\n' +
          'Drücken Sie [OK], wenn Sie einen Artikel zuweisen möchten.')) {
          return;
        } else {
          this.waitingForInventarData = false;
          console.log('InventFormComponente #1034 handleScanData', { waitingForNewInventarBarcode: this.waitingForNewInventarBarcode });
        }
      } else {
        console.log('InventFormComponente #986 Found Artikel-Barcode', { bcResult });
        console.log('InventFormComponente #987 Continue ...');
      }
    }

    switch (bcResult.lookupResultTable) {
      case LookupResultTable.None:
        console.log('InventFormComponente #990 handleScanData LookupResultTable.None');
        this.clearFormInventar();
        this.formInventar.Barcode = bcResult.barcode;
        this.waitingForInventarData = true;

        this.playSuccess().then( () => {
          // this.openSelectSearchArtikel();
        });

        // ToDo: Reaktion auf neuen Barcode ändern in Neufnahme
        // User soll daraufhin einen Artikel zuweisen können
        this.toastr.warning(
          'Barcode: ' + barcode + '<br>' +
          'Für eine Neuaufnahme weisen sie bitte einen Artikel zu!',
          'Unbekannter Barcode'
        );
        break;

      case LookupResultTable.Raeume:
        console.log('InventFormComponente #1008 handleScanData LookupResultTable.Raeume');
        if (bcResult.raum.gid === this.buildingID) {
          this.loadRaumByData( bcResult.raum );
          this.playSuccess();
          return;
        } else {
          const geb = bcResult.gebaeude;
          const gebName = geb ? (geb.Gebaeude || geb.Adresse) : ' Unbekannte Standort-ID ' + bcResult.raum.gid;
          this.playError();
          this.toastr.error(
            'Der gescannte Raum-Barcode ist einem anderen Standort zugewiesen: ' + gebName,
            'Fehler: Raum kann nicht geladen werden!'
          );
          if (0) {
            alert('Fehler: Raum kann nicht geladen werden\n' +
              'Der gescannte Raum-Barcode ist einem anderen Standort zugewiesen:\n' +
              gebName
            );
          }
        }
        break;

      case LookupResultTable.Inventar:
        console.log('InventFormComponente #1031 handleScanData LookupResultTable.Inventar');
        this.modalService.dismissAll();
        this.assignInventarToRaum( {
          inventar: bcResult.inventar,
          artikelRef: bcResult.artikelRef,
          artikelData: bcResult.artikelData
        } );
        this.playSuccess();
        break;

      case LookupResultTable.ObjektKatalogMandant:
        console.log('InventFormComponente #1095 handleScanData LookupResultTable.Mandant', { bcResult });
        if (!this.formInventar.Barcode) {
          this.playError();
          this.toastr.error(
            'Bitte scanne erst einen neuen InventarBarcode für die Artikelzuweisung',
            'Fehler bei Barcodezuweisung');
        }
        if (!this.waitingForInventarData && this.formInventar.uuid) {
          this.playError();
          this.toastr.warning(
            'Sie versuchen gerade bereits zugewiesene Inventar-Daten zu ändern',
            'Warnung');
        }
        this.loadArtikelByData({
          ...bcResult.artikelRef,
          ...{mcuuid: bcResult.artikelRef.uuid },
          ...bcResult.artikelData
        }).then( (success) => {
          if (success) {
            this.playSuccess();
          } else {
            this.playError();
          }
        });
        break;

      default:
        this.playError();
        this.toastr.error('Ungültiger oder nicht richtig erkannter Barcode!');
    }
  }

  displayScannedBarcode(barcode: string) {
    this.input2.nativeElement.value = barcode;
    this.lastScanDetectTime = new Date();
    this.lastScanDetectClass = 'NewFreshScan CountDown-5';
    let countdown = 5;
    if (this.lastScanDetectTimer) {
      clearInterval(this.lastScanDetectTimer);
      this.lastScanDetectTimer = null;
    }
    this.lastScanDetectTimer = setInterval( () => {
      this.lastScanDetectClass = 'NewFreshScan CountDown-' + (--countdown);
      if (countdown < 1) {
        this.lastScanDetectClass = '';
        clearInterval(this.lastScanDetectTimer);
        this.lastScanDetectTimer = null;
      }
    }, 1000);
  }

  // dummy
  simulateScanner() {

    if (!this.inputSimulateBarcode.nativeElement.value) {
      this.inputSimulateBarcode.nativeElement.value = 'A-1-3-1-78eae45';
    }
    const s = this.inputSimulateBarcode.nativeElement.value;
    for (const character of s) {
    // for (let i = 0; i < s.length; i++) {
      const shiftKey = (s !== s.toLowerCase() && s === s.toUpperCase());
      if (shiftKey) {
        const shift = new KeyboardEvent('keydown', {bubbles : true, cancelable : true,
          key : 'Shift', code: 'ShiftLeft', shiftKey });
        document.dispatchEvent( shift );
      }
      const e = new KeyboardEvent('keydown', {bubbles : true, cancelable : true, key : character, shiftKey });
      setTimeout(() => document.dispatchEvent(e));
    }
    const xe = new KeyboardEvent('keydown', {bubbles : true, cancelable : true, key : 'Enter', shiftKey : false});
    setTimeout(() => document.dispatchEvent(xe));
  }

  async playSuccess() {
    this.showBlobAlertSuccess();
    this.sounds.playSuccess();
  }

  async playError(): Promise<void> {
    this.showBlobAlertError();
    this.sounds.playError();
  }

}
