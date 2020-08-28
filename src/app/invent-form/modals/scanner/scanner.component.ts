import {Component, ElementRef, EventEmitter, OnInit, VERSION, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import BarcodeFormat from '@zxing/library/esm/core/BarcodeFormat';
import {BehaviorSubject} from 'rxjs';
import {DataService} from '../../../inventory/service/data.service';
import {BarcodeService} from '../../data-services/barcode.service';
import {BarcodeLookupSimpleResult, DBDIImages, LookupResultTable} from '../../../dexie.service';
import {faBan, faCheck} from '@fortawesome/free-solid-svg-icons';

export interface ScannerBarcodeData {
  barcode?: string;
  length?: number;
  valid?: boolean;
  result?: BarcodeLookupSimpleResult;
}
export enum bcLookupTyp {
  Neu,
  Unbekannt,
  Raum,
  Artikel,
  Inventar
}

interface ScanResultItem {
  barcode: string;
  typ?: bcLookupTyp;
  typToString?: string;
  infos?: string;
  image?: DBDIImages;
  result?: BarcodeLookupSimpleResult;
}

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss'],
  animations: [
  ]
})
export class ScannerComponent implements OnInit {
  ngVersion = VERSION.full;

  faCheck = faCheck;
  faBan = faBan;

  availableDevices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo = null;

  onScan = new EventEmitter<ScannerBarcodeData>();
  scanResultTarget?: HTMLElement;

  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.CODE_128
    // , BarcodeFormat.DATA_MATRIX
    // , BarcodeFormat.EAN_13
    // , BarcodeFormat.QR_CODE
  ];

  hasDevices: boolean;
  hasPermission: boolean;

  @ViewChild('barcodeChangedPart', { static: true })
  barcodeChangedPart: ElementRef;

  qrResultString: string;
  scannedUnchangedPart: string;
  scannedChangedPart: string;
  scannedBarcode?: string;
  scannedBarcodeInfos?: string;
  scannedBarcodeInfoImg?: DBDIImages;
  scannedBarcodeRsltTyp?: bcLookupTyp;
  scanBCLookupSimpleResult?: BarcodeLookupSimpleResult;
  scanResultHistory: ScanResultItem[] = [];
  scanResultCurrent?: ScanResultItem;

  torchEnabled = false;
  torchAvailable$ = new BehaviorSubject<boolean>(false);
  tryHarder = false;

  constructor(
//    private readonly _dialog: MatDialo,
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private bcLookup: BarcodeService
  ) {}


  ngOnInit() {
  }

  clearResult(): void {
    this.qrResultString = null;
  }

  bctest(test) {
    console.log({test});
    if (typeof test === 'string' && test.length) {
      this.onCodeResult( test );
    }
  }

  applyResult(): void {
    this.onScan.emit({
      barcode: this.scanBCLookupSimpleResult.barcode,
      length: this.scanBCLookupSimpleResult.barcode.length,
      valid: true,
      result: this.scanBCLookupSimpleResult
    } as ScannerBarcodeData);
  }

  bcLookupTypToString(typ: bcLookupTyp): string {
    return bcLookupTyp[ typ ];
  }

  showResult(result: BarcodeLookupSimpleResult): void {
    this.scanBCLookupSimpleResult = result;
    this.scannedBarcodeInfoImg = result.image;
    switch (result.lookupResultTable) {
      case LookupResultTable.None:
        this.scannedBarcodeRsltTyp = bcLookupTyp.Neu;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Neuer oder unbekannter Barcode'
        });
        break;

      case LookupResultTable.Raeume:
        this.scannedBarcodeRsltTyp = bcLookupTyp.Raum;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Raum',
          Gebaeude: result.gebaeude.Gebaeude || result.gebaeude.Adresse,
          Raum: result.raum.Raum,
          Bezg: result.raum.Raumbezeichnung,
          Etage: result.raum.Etage
        });
        break;

      case LookupResultTable.Inventar:
        this.scannedBarcodeRsltTyp = bcLookupTyp.Inventar;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Inventar',
          InventarNr: result.inventar.iv_nr,
          Bezeichnung: result.artikelData.Bezeichnung,
          Typ: result.artikelData.Typ,
          Farbe: result.artikelData.Farbe,
          Groesse: result.artikelData.Groesse,
          Kategorie: result.artikelData.Kategorie
        });
        break;

      case LookupResultTable.ObjektKatalogMandant:
        this.scannedBarcodeRsltTyp = bcLookupTyp.Artikel;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Artikel',
          Bezeichnung: result.artikelData.Bezeichnung,
          Typ: result.artikelData.Typ,
          Farbe: result.artikelData.Farbe,
          Groesse: result.artikelData.Groesse,
          Kategorie: result.artikelData.Kategorie
        });
        break;

      default:
        this.scannedBarcodeRsltTyp = bcLookupTyp.Unbekannt;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Unerwartetes Ergebnise',
          Objekt: LookupResultTable[result.lookupResultTable]
        });
    }

    const newHistoryItem = (this.scanResultCurrent) ? { ...this.scanResultCurrent } : null;

    this.scanResultCurrent = {
      typ: this.scannedBarcodeRsltTyp,
      typToString: bcLookupTyp[ this.scannedBarcodeRsltTyp ],
      barcode: this.scannedBarcode,
      infos: this.scannedBarcodeInfos,
      image: this.scannedBarcodeInfoImg,
      result
    };

    this.addHistoryResult(newHistoryItem );
  }

  addHistoryResult(result: ScanResultItem): number {
    if (result) {
      this.scanResultHistory.unshift(result);
      while (this.scanResultHistory.length > 10) {
        this.scanResultHistory.pop();
      }
    }
    return this.scanResultHistory.length;
  }

  removeResult(result: any): void {
    console.log('remove Result', { result });
  }

  applyHistoryResult(result: any): void {
  console.log('apply Result', { result });
  }

  clearHistory(): void {
    this.scanResultHistory = [];
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
    if (this.hasDevices) {
      for (const dev of this.availableDevices) {
        console.log( 'found camera mediaDeviceInfo: ', dev);
      }
    }
  }

  bcInfoToString(json: any): string {
    return JSON.stringify( json ).substr(1).split('').slice(0, -1).join('');
  }

  onCodeResult(resultString: string) {
    const oldBarcode: string = this.scannedBarcode || '';
    this.scannedBarcode = resultString;
    this.scannedBarcodeInfos = '';
    this.scannedBarcodeInfoImg = null;
    this.bcLookup.fullLookup(resultString).then( (result) => {
      this.showResult( result );
    });
    const resultLength = resultString.length;
    let numMatchingStart = 0;
    const checkLength = Math.min(resultLength, oldBarcode.length);
    if (oldBarcode !== resultString) {
      for (let i = 1; i <= checkLength; i++) {
        if (oldBarcode.substr(0, i) === resultString.substr(0, i)) {
          numMatchingStart = i;
        }
        console.log('i', i, oldBarcode.substr(0, i), resultString.substr(0, i), numMatchingStart);
      }

      if (numMatchingStart) {
        this.scannedUnchangedPart = resultString.substr(0, numMatchingStart);
        this.scannedChangedPart = resultString.substr(numMatchingStart);
      } else {
        this.scannedUnchangedPart = '';
        this.scannedChangedPart = resultString.substr(numMatchingStart);
      }
      const htmlChangedPart: HTMLElement = this.barcodeChangedPart.nativeElement;
      htmlChangedPart.classList.remove('with-pulse-effect');
      void htmlChangedPart.offsetWidth;
      htmlChangedPart.classList.add('with-pulse-effect');
      console.log({ oldBarcode, resultString, checkLength, resultLength, numMatchingStart,
        scannedUnchangedPart: this.scannedUnchangedPart,
        scannedChangedPart: this.scannedChangedPart
      });
    }
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices.find(x => x.deviceId === selected);
    this.currentDevice = device || null;
  }

  openFormatsDialog() {
    const data = {
      formatsEnabled: this.formatsEnabled,
    };
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;
  }

  openInfoDialog() {
    const data = {
      hasDevices: this.hasDevices,
      hasPermission: this.hasPermission,
    };
  }

  onTorchCompatible(isCompatible: boolean): void {
    this.torchAvailable$.next(isCompatible || false);
  }

  toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled;
  }

  toggleTryHarder(): void {
    this.tryHarder = !this.tryHarder;
  }

}
