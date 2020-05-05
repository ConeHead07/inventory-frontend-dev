import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Location} from '@angular/common';
import {DataService, InventarData} from '../inventory/service/data.service';
import {DBDIMandanten} from '../inventory/models/client.model';
import {DBDIGebaeude} from '../inventory/models/building.model';
import {InventarModel} from '../inventory/models/inventar.model';
import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {InventoryProgress, InventoryProgressService} from '../inventory-progress.service';

import {ScanDetectData} from '../inventory/components/scannerdetection/scannerdetection.component';

import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
// Dialogs
import {ScannerBarcodeData, ScannerComponent} from './modals/scanner/scanner.component';
import {CreateArtikelImageComponent} from './modals/create-artikel-image/create-artikel-image.component';
import {ShowArtikelImageComponent} from './modals/show-artikel-image/show-artikel-image.component';
import {SelectCreateArtikelComponent} from './modals/select-create-artikel/select-create-artikel.component';
import {SelectSearchArtikelComponent} from './modals/select-search-artikel/select-search-artikel.component';
import {SelectCreateRaumComponent} from './modals/select-create-raum/select-create-raum.component';
import {
  DBDIArtikel,
  DBDIInventar, DBDIObjektKatalogGlobal, DBDIObjektKatalogMandant,
  DBDIRaeume,
  DBDIRaumGebaeude,
  LookupAssignedInventar,
  LookupResultType
} from '../dexie.service';
import {SelectSearchRaumComponent} from './modals/select-search-raum/select-search-raum.component';
import {BasedataService} from '../basedata.service';
import {InventoryEditorService} from '../inventory-editor.service';

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

interface RaumStatus {
  hasTotal: boolean;
  total: number;
  numDone: number;
}

interface FormInventar {
  ivid?: number;
  mcid?: number;
  gcid?: number;
  rid?: number;
  Raum?: string;
  Raumbezeichnung?: string;
  RaumBarcode?: string;
  Barcode?: string;
  Bezeichnung?: string;
  Typ?: string;
}

@Component({
  selector: 'app-invent-form',
  templateUrl: './invent-form.component.html',
  styleUrls: ['./invent-form.component.scss']
})
export class InventFormComponent implements OnInit, OnDestroy {

  faSearch = faSearch;

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
    ignoreOverElement: [],
    barcodeType: ''
  };

  public formInventar: FormInventar = {
    ivid: null,
    mcid: null,
    gcid: null,
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

  public invObject: InventarModel;
  public raumStatus: RaumStatus;

  private clientID: number;
  private buildingID: number;
  private roomID?: number;
  private artikelID?: number;
  private routingSubscription: any;

  public lastScanDetectTime?: Date;
  public lastScanDetectClass = '';
  private lastScanDetectTimer = null;

  private jobProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  private raumProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private dataService: DataService,
    private modalService: NgbModal,
    private baseData: BasedataService,
    private inventoryProgress: InventoryProgressService,
    private inventoryEditor: InventoryEditorService) {}

  ngOnInit() {
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
    console.log('#144 loadRaumByData refreshRaumProgress')

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
    this.formInventar.gcid = artikel.gcid;
    this.formInventar.Bezeichnung = artikel.Bezeichnung;
    this.formInventar.Typ = artikel.Typ;
    this.formInventar.Barcode = '';
    this.formInventar.ivid = null;
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
    this.formInventar.Bezeichnung = artikelData.Bezeichnung;
    this.formInventar.Typ = artikelData.Typ;
    this.formInventar.Barcode = inventar.code;
    this.formInventar.ivid = inventar.ivid;
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
    modalRef.componentInstance.name = 'World';
  }

  openShowArtikelImage() {
    const modalRef = this.modalService.open(ShowArtikelImageComponent);
    modalRef.componentInstance.name = 'World';
  }

  openScanner() {
    const modalRef = this.modalService.open(ScannerComponent);
    modalRef.componentInstance.name = 'World';
    const sub = modalRef.componentInstance.onScan.subscribe((data: ScannerBarcodeData) => {
      const scan: ScanDetectData = {
        barcode: data.barcode,
        length: data.length,
        valid: data.valid
      };
      this.handleScanData( scan );
    });
  }

  openSelectCreateArtikel() {
    const modalRef = this.modalService.open(SelectCreateArtikelComponent);
    modalRef.componentInstance.name = 'World';
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelCreated.subscribe( (artikel: DBDIArtikel) => {
      this.loadArtikelByData( artikel );
    });
    modalRef.componentInstance.artikelSearching.subscribe( (raum: number) => {
      this.openSelectSearchArtikel();
    });
  }

  openSelectSearchArtikel() {
    const modalRef = this.modalService.open(SelectSearchArtikelComponent);
    modalRef.componentInstance.clientId = this.clientID;
    modalRef.componentInstance.artikelSelected.subscribe((item: DBDIArtikel) => {
      this.loadArtikelByData(item);
    });
    modalRef.componentInstance.artikelCreating.subscribe((mid: number) => {
      modalRef.close();
      this.openSelectCreateArtikel();
    });
  }

  openSelectSearchRaum() {
    const modalRef = this.modalService.open(SelectSearchRaumComponent);
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
    modalRef.componentInstance.gebaeudeId = this.buildingID;
    modalRef.componentInstance.raumCreated.subscribe( (raum: DBDIRaeume) => {
      this.loadRaumByData(raum);
    });
    modalRef.componentInstance.raumSearching.subscribe( (raum: number) => {
      this.openSelectSearchRaum();
    });
  }

  ngOnDestroy(): void {
    this.routingSubscription.unsubscribe();
  }

  onRaumBarcodeInput(event: Event): void {
    if (event.target instanceof HTMLInputElement || 'value' in event.target ) {
      console.log('BarCodeInput:', event.target.value );
    }
  }

  onBarcodeInput(): void {}

  handleScanData(event: ScanDetectData) {
    console.log(event);
    this.input2.nativeElement.value = event.barcode;
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

    let matches = null;
    matches = matches = event.barcode.match(/^(A)-(\d+)-(\d+)-(\d+)-([0-9a-zA-Z]+)$/);
    if ( matches ) {
      const [, src, id, mid, gkid, hashStart ] = matches;
      console.log( 'search for scanned Article', { src, id, mid, gkid, hashStart });

      this.dataService.getArtikel( parseInt(id, 10) )
        .then((artikel: DBDIArtikel) => {
          console.log(artikel );
        } )
        .catch(() => console.error(arguments) );
      return;
    }

    matches = matches = event.barcode.match(/^(R)-(\d+)-(\d+)-(\d+)-([0-9a-zA-Z]+)$/);
    if ( matches ) {
      const [ , src, id, mid, gid, hashStart ] = matches;
      console.log('Search scanned Room', { src, id, mid, gid, hashStart });

      this.dataService.getRaum( parseInt(id, 10) )
        .then( (raum: DBDIRaumGebaeude) => {
          console.log('Retrieved Raum', {raum});
          this.loadRaumByData( raum );
        });
      return;
    }

    console.log('Start Barcode-Lookup');
    const result = this.dataService.barcodeLookup(event.barcode, this.kunde.mid);
    result.then( lookupResult => {
      switch (lookupResult.type) {
        case LookupResultType.Inventar:
          const lookupInventar: LookupAssignedInventar = lookupResult;
          const inv = lookupInventar.inventar;
          console.log('Assign Inventar');
          const inventarData: InventarData = {
            inventar: lookupInventar.inventar,
            artikelRef: lookupInventar.artikelRef,
            artikelData: lookupInventar.artikelData
          };
          this.assignInventarToRaum( inventarData );
          break;

        case LookupResultType.Raum:
          const raum = lookupResult.raum;
          this.loadRaumByData( raum );
          break;

        case LookupResultType.NoMatch:
        default:
          // ERROR
      }
    });

    console.log('Result of Barcode-Lookup', {result });

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
