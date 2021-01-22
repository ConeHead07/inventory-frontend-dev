import {Component, ElementRef, EventEmitter, OnInit, VERSION, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import BarcodeFormat from '@zxing/library/esm/core/BarcodeFormat';
import {BehaviorSubject} from 'rxjs';
import {DataService} from '../../../inventory/service/data.service';
import {BarcodeService} from '../../data-services/barcode.service';
import {BarcodeLookupSimpleResult, DBDIImages, LookupResultTable} from '../../../dexie.interfaces';
import {faTrashAlt, faCheck} from '@fortawesome/free-solid-svg-icons';
import {ImagesService} from '../../data-services/images.service';
import {ZXingScannerComponent} from '@zxing/ngx-scanner';
import {BasedataService} from '../../../basedata.service';
import {VariablesService} from "../../../inventory/service/variables.service";

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
  faRemove = faTrashAlt;

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

  @ViewChild('scanner', { static: true })
  scanner: ZXingScannerComponent;

  @ViewChild('barcodeChangedPart', { static: true })
  barcodeChangedPart: ElementRef;

  jobid: number;
  allowBarcodeInput = false;
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
    private bcLookup: BarcodeService,
    private imageService: ImagesService,
    private baseData: BasedataService,
    private variables: VariablesService
  ) {}


  ngOnInit() {
    this.jobid = this.baseData.getCurrentJobid();

    this.variables.get('manualBarcodeInput', false).then( (status) => {
      this.allowBarcodeInput = status;
    });
  }

  clearResult(): void {
    this.qrResultString = null;
    this.scanResultCurrent = null;
  }

  bctest(test) {
    console.log({test});
    if (typeof test === 'string' && test.length) {
      this.onCodeResult( test );
    }
  }

  applyResult(): void {
    const emitScanResult = {
      barcode: this.scanBCLookupSimpleResult.barcode,
      length: this.scanBCLookupSimpleResult.barcode.length,
      valid: true,
      result: this.scanBCLookupSimpleResult
    } as ScannerBarcodeData;
    console.log('apply applyResult ', { emitScanResult });
    this.onScan.emit( emitScanResult );
  }

  bcLookupTypToString(typ: bcLookupTyp): string {
    return bcLookupTyp[ typ ];
  }

  showResult(result: BarcodeLookupSimpleResult): void {
    this.scanBCLookupSimpleResult = result;
    this.scannedBarcodeInfoImg = result.image;
    let bezeichnung = '';
    switch (result.lookupResultTable) {
      case LookupResultTable.None:
        bezeichnung = 'Neuer Barcode';
        this.scannedBarcodeRsltTyp = bcLookupTyp.Neu;
        this.scannedBarcodeInfos = this.bcInfoToString({
          Gefunden: 'Neuer oder unbekannter Barcode'
        });
        break;

      case LookupResultTable.Raeume:
        const g = (result.gebaeude.Gebaeude || result.gebaeude.Adresse);
        if (g) {
          bezeichnung += `${g} :: `;
        }
        bezeichnung += result.raum.Raum;
        if (result.raum.Raumbezeichnung) {
          bezeichnung += ' / ' + result.raum.Raumbezeichnung;
        }
        if (result.raum.Etage) {
          bezeichnung += ' :: ' + result.raum.Etage;
        }
        bezeichnung = (result.gebaeude.Gebaeude || result.gebaeude.Adresse);
        this.scannedBarcodeRsltTyp = bcLookupTyp.Raum;
        this.scannedBarcodeInfos = bezeichnung;

        this.bcInfoToString({
          Gefunden: 'Raum',
          Gebaeude: result.gebaeude.Gebaeude || result.gebaeude.Adresse,
          Raum: result.raum.Raum,
          Bezg: result.raum.Raumbezeichnung,
          Etage: result.raum.Etage
        });
        break;

      case LookupResultTable.Inventar:
        if (result.artikelData.Typ) {
          bezeichnung = result.artikelData.Typ + ' :: ';
        }
        bezeichnung += result.artikelData.Bezeichnung;
        if (result.artikelData.Farbe) {
          bezeichnung += ' :: ' + result.artikelData.Farbe;
        }
        if (result.artikelData.Groesse) {
          bezeichnung += ' :: ' + result.artikelData.Groesse;
        }
        if (result.artikelData.Kategorie) {
          bezeichnung += ' :: ' + result.artikelData.Kategorie;
        }
        this.scannedBarcodeRsltTyp = bcLookupTyp.Inventar;
        this.scannedBarcodeInfos = bezeichnung;

        this.bcInfoToString({
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
        bezeichnung = result.artikelData.Bezeichnung;
        if (result.artikelData.Farbe) {
          bezeichnung += ' :: ' + result.artikelData.Farbe;
        }
        if (result.artikelData.Groesse) {
          bezeichnung += ' :: ' + result.artikelData.Groesse;
        }
        if (result.artikelData.Kategorie) {
          bezeichnung += ' :: ' + result.artikelData.Kategorie;
        }

        this.scannedBarcodeRsltTyp = bcLookupTyp.Artikel;
        this.scannedBarcodeInfos = bezeichnung;
        this.bcInfoToString({
          Gefunden: 'Artikel',
          Bezeichnung: result.artikelData.Bezeichnung,
          Typ: result.artikelData.Typ,
          Farbe: result.artikelData.Farbe,
          Groesse: result.artikelData.Groesse,
          Kategorie: result.artikelData.Kategorie
        });
        break;

      default:
        bezeichnung = 'Unerwartetes Ergebnis';
        this.scannedBarcodeRsltTyp = bcLookupTyp.Unbekannt;
        this.scannedBarcodeInfos = bezeichnung;
        this.bcInfoToString({
          Gefunden: 'Unerwartetes Ergebnis',
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
    const lastResult = this.scanResultCurrent;

    if (this.scannedBarcodeInfoImg && this.scannedBarcodeInfoImg.gcuuid) {
      this.loadImageByGcuuid(this.scannedBarcodeInfoImg.gcuuid).then( img => {
        if (this.scanResultCurrent === lastResult) {
          this.scanResultCurrent.image.data_url = img.data_url;
        } else {
          const lastResultFound = this.scanResultHistory.find( r => r === lastResult);
          if (lastResultFound) {
            lastResultFound.image.data_url = img.data_url;
          }
        }
      });
    }

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
    this.scanResultHistory = this.scanResultHistory.filter( r => r !== result);
    console.log('remove Result', { result });
    // alert(JSON.stringify(result));
  }

  applyHistoryResult(result: ScanResultItem): void {
    const emitScanResult = {
      barcode: this.scanBCLookupSimpleResult.barcode,
      length: this.scanBCLookupSimpleResult.barcode.length,
      valid: true,
      result: this.scanBCLookupSimpleResult
    } as ScannerBarcodeData;
    console.log('apply applyHistoryResult', { emitScanResult });
    this.onScan.emit( emitScanResult );
  }

  clearHistory(): void {
    this.scanResultHistory = [];
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    // this.allowBarcodeInput = false;
    this.hasDevices = Boolean(devices && devices.length);
    if (this.hasDevices) {
      for (const dev of this.availableDevices) {
        console.log( 'found camera mediaDeviceInfo: ', dev);
      }
    }
  }

  bcInfoToString(json: any): string {
    return JSON.stringify( json ).substr(1).split('').slice(0, -1).join('');
    let tbl = '<table>';
    for (const k of Object.keys(json)) {
      tbl += '<tr><th>' + k + '</th><td>' + json[k] + '</td>';
    }
    tbl += '</table>';
    return tbl;
  }

  onCodeResult(resultString: string) { // resultString: string
    // const resultString = '0000037536';
    const oldBarcode: string = this.scannedBarcode || '';
    this.scannedBarcode = resultString;
    this.scannedBarcodeInfos = '';
    this.scannedBarcodeInfoImg = null;
    this.bcLookup.fullLookup(resultString, this.jobid).then( (result) => {
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

  async loadImageByGcuuid(gcuuid: string): Promise<DBDIImages|null> {
    console.log('called loadImageByGcuuid', gcuuid);
    if (gcuuid) {
      return this.imageService.getImage(gcuuid)
        .then( image => {
          return image;
        })
        .catch( err => {
          console.error( err );
          return null;
        });
    } else {
      return null;
    }
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices.find(x => x.deviceId === selected);
    this.currentDevice = device || null;
    // this.allowBarcodeInput = !device;
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
