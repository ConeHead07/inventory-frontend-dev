import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Location} from '@angular/common';
import {DataService, InventarData} from '../inventory/service/data.service';
import {DBDIMandanten} from '../inventory/models/client.model';
import {DBDIGebaeude} from '../inventory/models/building.model';
import {faCamera, faImage, faSearch, faCheck, faDoorClosed, faDoorOpen } from '@fortawesome/free-solid-svg-icons';
import {InventoryProgress, InventoryProgressService} from '../inventory-progress.service';

import {ScanDetectData} from '../inventory/components/scannerdetection/scannerdetection.component';

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

import {
  DBDIArtikel,
  DBDIInventar,
  DBDIRaeume,
  DBDIRaumEditStatus,
  DBDIRaumGebaeude,
  IUnionLookupAssignedObject,
  LookupResultTable,
  LookupResultType
} from '../dexie.service';
import {SelectSearchRaumComponent} from './modals/select-search-raum/select-search-raum.component';
import {BasedataService} from '../basedata.service';
import {InventoryEditorService} from '../inventory-editor.service';
import {InventarService} from './data-services/inventar.service';
import {ImagesService} from './data-services/images.service';
import {BarcodeService} from './data-services/barcode.service';
import {RaumIDAndStatus, RaumService} from './data-services/raum.service';
import {GesamtListRestComponent} from './modals/gesamt-list-rest/gesamt-list-rest.component';
import {GesamtListDoneComponent} from './modals/gesamt-list-done/gesamt-list-done.component';

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
  ivid?: number;
  mcid?: number;
  mcuuid?: string;
  gcid?: number;
  gcuuid?: string;
  rid?: number;
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

/*
if ( matchesObjektbuchArtikel ) {
      const [, src, id, mid, gkid, hashStart ] = matchesObjektbuchArtikel;
      console.log( 'search for scanned Article', { src, id, mid, gkid, hashStart });
 */

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

  faSearch = faSearch;
  faCamera = faCamera;
  faImage = faImage;
  faCheck = faCheck;
  faDoorOpen = faDoorOpen;
  faDoorClosed = faDoorClosed;

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
    ivid: null,
    mcid: null,
    gcid: null,
    gcuuid: null,
    rid: null,
    Raum: null,
    Raumbezeichnung: null,
    RaumBarcode: null,
    Barcode: '',
    Bezeichnung: '',
    Typ: '',
  };

  public kunde?: DBDIMandanten;
  public gebaeude?: DBDIGebaeude;
  public raum?: DBDIRaeume;
  public inventarData?: InventarData;

  private clientID: number;
  private buildingID: number;
  private roomID?: number;
  private artikelID?: number;
  private routingSubscription: any;

  public lastScanDetectTime?: Date;
  public lastScanDetectClass = '';
  private lastScanDetectTimer = null;
  private waitingForNewInventarBarcode = false;
  private openedCreateRaum = false;
  private artikelImageExists = false;

  private jobProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  private raumEditStatus: DBDIRaumEditStatus;

  private raumProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  private currentModal: CurrentModal = {
    modalRef: null,
    isOpen: false,
    name: ''
  };

  private currentModals: CurrentModal[] = [];

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
    private bcLookup: BarcodeService) {
  }

  ngOnInit() {
    this.raumService.raumStatusChanged.subscribe( (stat: RaumIDAndStatus) => {
      if (stat.rid === this.roomID) {
        this.raumEditStatus = stat.status;
      }
    });
    this.routingSubscription = this.route.params.subscribe(params => {
      this.clientID = parseInt( params.clientid,  10 );
      this.buildingID = parseInt( params.buildingid, 10 );
      const roomID = parseInt( params.roomid, 10 );

      this.dataService.getClient( this.clientID ).then( (clnt) => {
        this.kunde = clnt;
      });

      this.dataService.getBuilding( this.buildingID, this.clientID ).then( (bldg) => {
        this.gebaeude = bldg;
      });

      if (roomID) {
        this.loadRaumById( roomID );
      } else {
        const lastSelectedRoom = this.baseData.getCurrentRaum();
        if (lastSelectedRoom && lastSelectedRoom.gid === this.buildingID) {
          this.loadRaumByData( lastSelectedRoom );
        }
      }
      console.log({params, kunde: this.kunde, gebaeude: this.gebaeude });
      this.refreshInventoryProgress();
    });
  }

  loadRaumById( roomID: number) {
    this.dataService.getRaum( roomID )
      .then( (raum: DBDIRaumGebaeude) => {
        console.log('Retrieved Raum', {raum});
        this.loadRaumByData(raum);
      });
  }

  loadRaumByData(raum: DBDIRaeume) {
    const url = '/form-inventory/' + this.clientID + '/' + this.buildingID + '/' + raum.rid;
    console.log('Change URL ', { raum, url });
    this.location.go( url);
    this.roomID = raum.rid;
    this.raum = raum;
    this.baseData.setCurrentRaum( this.raum );
    this.formInventar.rid = raum.rid;
    this.formInventar.Raum = raum.Raum;
    this.formInventar.Raumbezeichnung = raum.Raumbezeichnung;
    this.formInventar.RaumBarcode = raum.code;
    this.raumEditStatus = this.raum.current_jobstatus;
    console.log('#144 loadRaumByData refreshRaumProgress');

    this.refreshRaumProgress();
  }

  async assignInventarToRaum(inventarData: InventarData) {
    this.loadInventarByData( inventarData );
    this.inventoryEditor.assignInventarToRaum(inventarData.inventar.ivid, this.roomID)
      .then( () => {
        console.log('Inventar wurde dem Raum zugewiesen!');
        this.refreshInventoryProgress();
    })
      .catch( (err) => {
        console.error('Inventar konnte nicht zugewiesen werden!', err);
      });
  }

  async saveNewInventar() {
    const jobid = this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const inventar: DBDIInventar = {
      mcid: this.formInventar.mcid,
      mcuuid: this.formInventar.mcuuid,
      rid: this.formInventar.rid,
      code: this.formInventar.Barcode,
      jobid,
      created_at: new Date(),
      created_uid: uid
    };
    this.inventarDataService.insertInventar(inventar, jobid);
  }

  async assignArtikelToRaum(artikelMcid: number) {}

  async refreshInventoryProgress() {

    return Promise.all([
      this.refreshGebaeudeProgress(),
      this.refreshRaumProgress()
    ]).then( () =>  {
      console.log('Fortschritt für Gebaeude und Raum wurde aktualisiert');
      return true;
    }).catch( (err) => {
      console.error('Beim Aktualisieren des Fortschritts von Gebaeude und Raum ist ein Fehler aufgetreten');
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

    this.inventoryProgress.getCurrentRaumProgress(this.roomID)
      .then( (progress: InventoryProgress) => {
        this.raumProgress.done = progress.done;
        this.raumProgress.total = progress.total;
      })
      .catch( err => {
        console.error( 'Fehler bei Raum-Progress-Aktualisierung', err );
      });
  }

  loadArtikelById( artikelID: number) {
    this.dataService.getArtikel( artikelID )
      .then( item => {
        this.loadArtikelByData( item );
      });
  }

  loadArtikelByData(artikel: DBDIArtikel) {
    this.artikelID = artikel.mcid;
    this.formInventar.mcid = artikel.mcid;
    this.formInventar.mcuuid = artikel.uuid;
    this.formInventar.gcid = artikel.gcid;
    this.formInventar.gcuuid = artikel.uuid;
    this.formInventar.Bezeichnung = artikel.Bezeichnung;
    this.formInventar.Typ = artikel.Typ;
    this.formInventar.Barcode = '';
    this.formInventar.ivid = null;

    const tmp = {...this.formInventar};
    this.formInventar = {...tmp};
    this.waitingForNewInventarBarcode = true;
    console.log('Applied argument artikel', artikel, ' to formInventar', this.formInventar);
    this.reloadImageExistsStatus();
  }

  loadInventarById(ivid: number) {
    this.dataService.getInventarData(ivid).then( result => {
      this.loadInventarByData( result.inventarData );
    });
  }

  loadInventarByData(inventarData: InventarData) {
    const inventar = inventarData.inventar;
    const artikelRef = inventarData.artikelRef;
    const artikelData = inventarData.artikelData;

    this.inventarData = inventarData;
    this.artikelID = inventar.mcid;
    this.formInventar.mcid = inventar.mcid;
    this.formInventar.gcid = artikelRef.gcid;
    this.formInventar.mcuuid = artikelRef.uuid;
    this.formInventar.gcuuid = artikelData.uuid;
    this.formInventar.Bezeichnung = artikelData.Bezeichnung;
    this.formInventar.Typ = artikelData.Typ;
    this.formInventar.Barcode = inventar.code;
    this.formInventar.ivid = inventar.ivid;

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

  get gebaeudeId() { return this.buildingID; }

  private openComponent(content: Component) {
    const modalRef = this.modalService.open(content);
    modalRef.componentInstance.name = 'World';
  }

  openCreateArtikelImage() {
    const modalRef = this.modalService.open(CreateArtikelImageComponent);
    modalRef.componentInstance.name = this.formInventar.Bezeichnung + '/' + this.formInventar.Typ;
    modalRef.componentInstance.gcuuid = this.formInventar.gcuuid;
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openShowArtikelImage() {
    const modalRef = this.modalService.open(ShowArtikelImageComponent);
    modalRef.componentInstance.name = 'World';
    modalRef.componentInstance.setGcuuid( this.formInventar.gcuuid );
    modalRef.result.then( () => {
      this.reloadImageExistsStatus();
    });
  }

  openScanner(inputElm?: HTMLElement) {
    const modalRef = this.modalService.open(ScannerComponent);
    modalRef.componentInstance.name = 'World';
    const sub = modalRef.componentInstance.onScan.subscribe((data: ScannerBarcodeData) => {
      const scan: ScanDetectData = {
        barcode: data.barcode,
        length: data.length,
        valid: data.valid,
        target: inputElm
      };
      this.handleScanData( scan );
    });
  }

  getModalRefByName(name): NgbModalRef {
    const modal = this.currentModals.find( mod => mod.name === name);
    return (modal && modal.modalRef.componentInstance) ? modal.modalRef : null;
  }

  modalWatch(modalRef: NgbModalRef, name: string) {
    const mRef = modalRef;
    const mName = name;
    console.log('Opened Modal: ', name);
    this.currentModal = {
      modalRef,
      name,
      isOpen: true
    };
    this.currentModals = this.currentModals.filter( mod => undefined !== mod.modalRef.componentInstance);
    this.currentModals.push( this.currentModal );
    console.log('After open Modal: ', this.currentModal, this.currentModals);

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
      console.log('After dismiss resolved: ', this.currentModal, this.currentModals);
    })
      .catch( (err) => {
        if (name === 'SelectCreateRaum') {
          this.openedCreateRaum = false;
        }
        this.currentModals = this.currentModals.filter( mod => undefined !== mod.modalRef.componentInstance);
        console.error('Error on Closing Modal ', { mName, err} );
        if (this.currentModals.length) {
          this.currentModal = this.currentModals[ this.currentModals.length - 1];
        } else {
          this.currentModal = {
            modalRef: null,
            name: '',
            isOpen: false
          };
        }
        console.log('After Catch: ', this.currentModal, this.currentModals);
      });
  }

  openSelectCreateArtikel() {
    const modalRef = this.modalService.open(SelectCreateArtikelComponent);
    this.modalWatch(modalRef, 'SelectCreateArtikel');
    modalRef.componentInstance.name = 'World';
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelCreated.subscribe( (artikel: DBDIArtikel) => {
      this.loadArtikelByData( artikel );
    });
    modalRef.componentInstance.artikelSelected.subscribe((item: ArtikelOption) => {
      console.log('#505 openSelectCreateArtikel Apply selected Article', item);
      this.loadArtikelById(item.id);
    });
    modalRef.componentInstance.artikelSearching.subscribe( (raum: number) => {
      this.openSelectSearchArtikel();
    });
  }

  openSelectSearchArtikel() {
    const modalRef = this.modalService.open(SelectSearchArtikelComponent);
    this.modalWatch(modalRef, 'SelectSearchArtikel');
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelSelected.subscribe((item: ArtikelOption) => {
      console.log('Apply selected Article', item);
      this.loadArtikelById(item.id);
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

  openSelectCreateRaum() {
    const modalRef = this.modalService.open(SelectCreateRaumComponent);
    this.modalWatch(modalRef, 'SelectCreateRaum');
    this.openedCreateRaum = true;
    modalRef.componentInstance.gebaeudeId = this.buildingID;
    modalRef.componentInstance.raumCreated.subscribe( (raum: DBDIRaeume) => {
      this.loadRaumByData(raum);
    });
    modalRef.componentInstance.raumSearching.subscribe( (raum: number) => {
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
    modalRef.componentInstance.requestGesamtRest.subscribe( (g: DBDIGebaeude) => {
      this.openGesamtListRest(g);
    });
  }

  openGesamtListRest(useGebaeude?: DBDIGebaeude) {
    const gebaeude = useGebaeude || this.gebaeude;
    if (!gebaeude || !gebaeude.gid) {
      console.error('No Gebaeude-Data!!!');
    } else {
      console.log('OpenGesamtListRest', {
        buildingID: this.buildingID,
        gebaeude: this.gebaeude
      });
    }
    const modalRef = this.modalService.open( GesamtListRestComponent );
    this.modalWatch(modalRef, 'GesamtListRest');
    modalRef.componentInstance.gebaeude = gebaeude;
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
  }

  toggleRaumEditStatus() {
    const jobid = this.baseData.getCurrentJobid();
    if (this.raumEditStatus !== DBDIRaumEditStatus.Closed) {
      this.raumService.setRaumStatusClosed(this.roomID, jobid);
    } else {
      this.raumService.setRaumStatusStarted(this.roomID, jobid);
    }
  }

  setRaumEditStatusClosed() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusClosed(this.roomID, jobid);
  }

  setRaumEditStatusStarted() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusStarted(this.roomID, jobid);
  }

  setRaumEditStatusUntouched() {
    const jobid = this.baseData.getCurrentJobid();
    this.raumService.setRaumStatusInit(this.roomID, jobid);
  }

  onRaumBarcodeInput(event: Event): void {
    if (event.target instanceof HTMLInputElement || 'value' in event.target ) {
      console.log('BarCodeInput :', event.target.value );
    }
  }

  showGesamtDone(): void {
    console.log('Called show Gesamt Done');
    this.openGesamtListDone();
  }

  showGesamtRest(): void {
    console.log('Called show Gesamt Rest');
    this.openGesamtListRest();
  }

  showRaumDone(): void {
    console.log('Called show Raum Done ...');
    this.openRaumListDone();
  }

  showRaumRest(): void {
    console.log('Called show Raum Rest');
    this.openRaumListRest();
  }

  async barcodeLookup( barcode: string): Promise<BCLookupResult> {
    const bclResult: BCLookupResult = {
      barcode,
      expectedType: LookupResultType.NoMatch,
      bcParts: null,
      result: { type: LookupResultType.NoMatch }
    };

    // Test auf Objektbuch - Artikel
    const matchesObjektbuchArtikel = barcode.match(/^(A)-(\d+)-(\d+)-(\d+)-([0-9a-zA-Z]+)$/);
    if ( matchesObjektbuchArtikel ) {
      const [, src, id, mid, gcid, hashStart ] = matchesObjektbuchArtikel;
      bclResult.expectedType = LookupResultType.ObjektBuchArtikel;
      bclResult.bcParts = { src, id, mid, gcid, hashStart } as BCPartsObjektbuchArtikel;

      const data = await this.dataService.getArtikelRefAndData( parseInt(id, 10) );
      if (data) {
        bclResult.result = {
          type: LookupResultType.ObjektBuchArtikel,
          artikelRef: data.artikelRef,
          artikelData: data.artikelData
        };
      }
      return bclResult;
    }

    // Test auf Objektbuch - Raum
    const matchesObjektbuchRaum = barcode.match(/^(R)-(\d+)-(\d+)-(\d+)-([0-9a-zA-Z]+)$/);
    if ( matchesObjektbuchRaum ) {
      const [ , src, id, mid, gid, hashStart ] = matchesObjektbuchRaum;
      bclResult.expectedType = LookupResultType.ObjektBuchRaum;
      bclResult.bcParts = { src, id, mid, gid, hashStart } as BCPartsObjektbuchRaum;

      const data = await this.dataService.getRaumAndGebaeude( parseInt(id, 10) );
      if (data) {
        bclResult.result = {
          type: LookupResultType.ObjektBuchRaum,
          raum: data.raum,
          gebaeude: data.gebaeude
        };
      }
      return bclResult;
    }

    console.log('Start Barcode-Lookup');
    bclResult.result = await this.dataService.barcodeLookup(barcode, this.kunde.mid);

    return bclResult;

    // switch (result.type) {
    //   case LookupResultType.Inventar:
    //     bclResult.result = {
    //       type: LookupResultType.Inventar,
    //       inventar: result.inventar,
    //       artikelRef: result.artikelRef,
    //       artikelData: result.artikelData
    //     };
    //     break;
    //
    //   case LookupResultType.Raum:
    //     bclResult.result = {
    //       type: LookupResultType.Raum,
    //       raum: result.raum,
    //       gebaeude: result.gebaeude
    //     };
    //     break;
    //
    //   default:
    //   // Nothing
    // }
    //
    // return bclResult;

  }

  onBarcodeInput(): void {}

  async handleScanData(event: ScanDetectData) {
    console.log(event);
    const bcResult = await this.bcLookup.fullLookup(event.barcode);
    const barcode = event.barcode;
    let expectedBarcodeType = this.waitingForNewInventarBarcode ? LookupResultType.Inventar : null;
    this.displayScannedBarcode(event.barcode);

    if (event.target && event.target.id) {
      switch ( event.target.id ) {
        case 'raumBarcode':
          expectedBarcodeType = LookupResultType.Raum;
          break;

        case 'newRaumBarcode':
          expectedBarcodeType = LookupResultType.ObjektBuchRaum;
          break;

        case 'invBarcode':
          break;
      }
    }

    const RaumCreateModal = this.getModalRefByName('SelectCreateRaum');

    if (RaumCreateModal && RaumCreateModal.componentInstance) {
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        const modalComp: SelectCreateRaumComponent = RaumCreateModal.componentInstance;
        modalComp.raumDaten.code = bcResult.barcode;
        return true;
      } else {
        alert('Ungültiger Barcode für Raun-Neu-Erfassung! ' +
          'Gebe einen gülten Barcode ein oder schließe den Dialog "Neuen Raum anlegen"!');
        return false;
      }
    }

    if (this.waitingForNewInventarBarcode) {
      if (bcResult.lookupResultTable === LookupResultTable.None) {
        this.formInventar.Barcode = bcResult.barcode;
        this.waitingForNewInventarBarcode = false;
        this.saveNewInventar();
        return true;
      } else {
        if (!confirm('Ungültiger Barcode für die Inventar-Neu-Anlage!' +
          'Bitte bestätige den Abbruch, wenn die vorherige Aktion abgebrochen werden soll.')) {
          return;
        }
      }
    }

    switch (bcResult.lookupResultTable) {
      case LookupResultTable.None:
        break;

      case LookupResultTable.Raeume:
        if (bcResult.raum.gid === this.buildingID) {
          this.loadRaumByData( bcResult.raum );
          return;
        } else {
          const geb = bcResult.gebaeude;
          const gebName = geb ? (geb.Gebaeude || geb.Adresse) : ' Unbekannte Standort-ID ' + bcResult.raum.gid;
          alert('Fehler: Raum kann nicht geladen werden\n' +
            'Der gescannte Raum-Barcode ist einem anderen Standort zugewiesen:\n' +
            gebName
          );
        }
        break;

      case LookupResultTable.Inventar:
        this.assignInventarToRaum( {
          inventar: bcResult.inventar,
          artikelRef: bcResult.artikelRef,
          artikelData: bcResult.artikelData
        } );
        break;

      case LookupResultTable.ObjektKatalogMandant:
        this.loadArtikelByData({
          ...bcResult.artikelRef,
          ...bcResult.artikelData
        });
        break;

      default:
        alert('Ungültiger oder nicht richtig erkannter Barcode!');
    }

    // OLD-Part, dessen Lokik mit neuem BC-Lookup übernommen werden muss
    this.barcodeLookup(barcode).then( (bclResult: BCLookupResult) => {
/*
      if (RaumCreateModal && RaumCreateModal.componentInstance) {
        if (bclResult.result.type === LookupResultType.NoMatch) {
          const modalComp: SelectCreateRaumComponent = RaumCreateModal.componentInstance;
          modalComp.raumDaten.code = barcode;
          return true;
        } else {
          alert('Ungültiger Barcode für Raun-Neu-Erfassung! ' +
            'Gebe einen gülten Barcode ein oder schließe den Dialog "Neuen Raum anlegen"!');
          return false;
        }
      }

      if (this.waitingForNewInventarBarcode) {
        if (bclResult.result.type === LookupResultType.NoMatch) {
          this.formInventar.Barcode = barcode;
          this.waitingForNewInventarBarcode = false;
          this.saveNewInventar();
          return true;
        } else {
          if (!confirm('Ungültiger Barcode für die Inventar-Neu-Anlage!' +
          'Bitte bestätige den Abbruch, wenn die vorherige Aktion abgebrochen werden soll.')) {
            return;
          }
        }
      }
 */

      switch (bclResult.result.type) {
        case LookupResultType.ObjektBuchRaum:
        case LookupResultType.Raum:
          this.loadRaumByData( bclResult.result.raum );
          return true;

        case LookupResultType.ObjektBuchArtikel:
          this.loadArtikelByData({
            ...bclResult.result.artikelRef,
            ...bclResult.result.artikelData
          });
          return true;

        case LookupResultType.Inventar:
          this.assignInventarToRaum( bclResult.result );
          return true;

        default:
          alert('Ungültiger oder nicht richtig erkannter Barcode!');
      }
    }).catch( (err) => {
      console.error(err);
    });
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
      const e = new KeyboardEvent('keyup', {bubbles : true, cancelable : true, key : character, shiftKey : false});
      setTimeout(() => document.dispatchEvent(e));
    }
    const xe = new KeyboardEvent('keyup', {bubbles : true, cancelable : true, key : 'Enter', shiftKey : false});
    setTimeout(() => document.dispatchEvent(xe));
  }

}
