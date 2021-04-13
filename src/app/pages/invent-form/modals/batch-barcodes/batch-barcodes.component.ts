import {Component, ElementRef, EventEmitter, OnDestroy, OnInit, VERSION, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import BarcodeFormat from '@zxing/library/esm/core/BarcodeFormat';
import {BehaviorSubject, Subscription} from 'rxjs';
import {DataService} from '../../../../shared/services/data.service';
import {BarcodeService} from '../../data-services/barcode.service';
import {
  BarcodeLookupSimpleResult,
  DBDIImages,
  DBDIRaeume,
  LookupResultTable
} from '../../../../shared/interfaces/dexie.interfaces';
import {faTrashAlt, faCheck} from '@fortawesome/free-solid-svg-icons';
import {ImagesService} from '../../data-services/images.service';
import {ZXingScannerComponent} from '@zxing/ngx-scanner';
import {BasedataService} from '../../../../shared/services/basedata.service';
import {VariablesService} from '../../../../shared/services/variables.service';
import {
  InventoryProgress,
  InventoryProgressService
} from "../../../../shared/inventory-progress/inventory-progress.service";
import {InventarService} from "../../data-services/inventar.service";

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

export interface LookupResultItem {
  barcode: string;
  typ?: bcLookupTyp;
  typToString?: string;
  infos?: string;
  image?: DBDIImages;
  result?: BarcodeLookupSimpleResult;
  ModalRaumUuid?: string;
  ModalJobid?: number;
}

@Component({
  selector: 'app-batch-barcodes',
  templateUrl: './batch-barcodes.component.html',
  styleUrls: ['./batch-barcodes.component.scss']
})
export class BatchBarcodesComponent implements OnInit, OnDestroy {
  faCheck = faCheck;
  faRemove = faTrashAlt;

  onScan = new EventEmitter<ScannerBarcodeData>();
  onLookupResultApply = new EventEmitter<LookupResultItem>();

  jobid = 0;
  raum: DBDIRaeume;

  batchBarcodes: string[] = [];
  uniqBatchBarcodes: string[] = [];
  scanResultHistory: LookupResultItem[] = [];
  scanResultAssigned: LookupResultItem[] = [];

  blobAlert?: string;
  private blobAlertTimer = null;
  useOverlay = 0;

  loadingTimer = null;
  loadingShow = false;
  loadingType = 'warning';
  loadingAnimated = true;
  loadingPercent = 0;
  loadingCurrent = 0;
  loadingTotal = 0;

  closeOnApplyBarcode = false;

  raumProgress: InventoryProgress = {
    total: 0,
    done: 0,
  };

  subRaumChanged: Subscription;

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private bcLookup: BarcodeService,
    private imageService: ImagesService,
    private baseData: BasedataService,
    private variables: VariablesService,
    private inventoryProgress: InventoryProgressService,
    private inventarDataService: InventarService
  ) {
  }

  ngOnInit() {
    this.jobid = this.baseData.getCurrentJobid();
    this.raum = this.baseData.getCurrentRaum();
    this.refreshRaumProgress();

    this.subRaumChanged = this.inventoryProgress.raumProgressChanged.subscribe(progress => {
      if (this.raum && this.raum.uuid !== progress.uuid) {
        return;
      }
      this.raumProgress.done = progress.done;
      this.raumProgress.total = progress.total;
    });
  }

  ngOnDestroy() {
    this.subRaumChanged.unsubscribe();
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

  setAssignedInventar(barcode: string) {
    const result = this.scanResultHistory.find( (r) =>  r.barcode === barcode);
    if (result) {
      this.removeResult(result);
      this.scanResultAssigned.unshift(result);
    }
  }

  async setLoadingIndicator(current: number, total: number): Promise<void> {
    this.loadingShow = true;
    if (current === 0 || current > this.loadingCurrent) {
      this.loadingPercent = (current > 0) ? current * 100 / total : 100;
      this.loadingCurrent = current;
      this.loadingType = (current > 0) ? 'success' : 'warning';
      this.loadingAnimated = current !== total;
      if (current === 0 && total > 0 && this.loadingTimer) {
        clearTimeout(this.loadingTimer);
        this.loadingTimer = null;
      }
      if (current > 0 && current === total) {
        this.loadingTimer = setTimeout(() => { this.loadingShow = false; }, 4000);
      }
    }
    this.loadingTotal = total;
  }

  setRaum(raum: DBDIRaeume): void {
    this.raum = raum;
  }

  setJobid(jobid: number): void {
    this.jobid = jobid;
  }

  setBarcodes(barcodes: string[]) {
    // setBarcodes wird aus InventFormComponent aufgerufen, noch bevor ngOnInit ausgefuehrt wurde

    const uniqBarcodes: string[] = [];
    for (let i = 0; i < barcodes.length; i++) {
      const bc = barcodes[i].trim();
      if (bc !== '' && uniqBarcodes.indexOf(bc) === -1) {
        uniqBarcodes.push(bc);
      }
    }
    this.batchBarcodes = barcodes;
    this.uniqBatchBarcodes = uniqBarcodes;

    const total = uniqBarcodes.length;
    let current = 0;
    this.setLoadingIndicator(current, total);

    console.log('BatchBarcodesComponent.setBarcodes(', barcodes, ') #106');
    this.clearResult();
    Promise.all(uniqBarcodes.map( async (code) => {
      const rslt = await this.bcLookup.fullLookup(code, this.jobid);
      ++current;
      this.setLoadingIndicator(current, total);
      return rslt;
    })).then( (lkUpResults) => {
      lkUpResults.reverse().forEach((rslt) => {
        this.showResult(rslt);
      });
    }).catch(() => {
      console.error('BatchBarcodesComponent.setBarcodes #121: Fehler bei Index-Barcode-Anfrage fuer', { arguments });
      alert('BatchBarcodesComponent.setBarcodes #121\nFehler bei Index-Barcode-Anfrage.');
    });
  }

  clearResult(): void {
    this.scanResultHistory.length = 0;
  }

  showResult(result: BarcodeLookupSimpleResult): void {
    let bezeichnung = '';
    let bcObjectType: bcLookupTyp = bcLookupTyp.Unbekannt;
    let bcObjectInfos = '';

    switch (result.lookupResultTable) {
      case LookupResultTable.None:
        bezeichnung = 'Neuer Barcode';
        bcObjectType = bcLookupTyp.Neu;
        bcObjectInfos = this.bcInfoToString({
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
        bcObjectType = bcLookupTyp.Raum;
        bcObjectInfos = bezeichnung;

        if (false) {
          this.bcInfoToString({
            Gefunden: 'Raum',
            Gebaeude: result.gebaeude.Gebaeude || result.gebaeude.Adresse,
            Raum: result.raum.Raum,
            Bezg: result.raum.Raumbezeichnung,
            Etage: result.raum.Etage
          });
        }
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
        if (result.artikelData.Gruppe) {
          bezeichnung += ' :: ' + result.artikelData.Gruppe;
        }
        bcObjectType = bcLookupTyp.Inventar;
        bcObjectInfos = bezeichnung;

        if (false) {
          this.bcInfoToString({
            Gefunden: 'Inventar',
            InventarNr: result.inventar.iv_nr,
            Bezeichnung: result.artikelData.Bezeichnung,
            Typ: result.artikelData.Typ,
            Farbe: result.artikelData.Farbe,
            Groesse: result.artikelData.Groesse,
            Kategorie: result.artikelData.Kategorie,
            Gruppe: result.artikelData.Gruppe
          });
        }
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

        bcObjectType = bcLookupTyp.Artikel;
        bcObjectInfos = bezeichnung;

        if (false) {
          this.bcInfoToString({
            Gefunden: 'Artikel',
            Bezeichnung: result.artikelData.Bezeichnung,
            Typ: result.artikelData.Typ,
            Farbe: result.artikelData.Farbe,
            Groesse: result.artikelData.Groesse,
            Kategorie: result.artikelData.Kategorie
          });
        }
        break;

      default:
        bezeichnung = 'Unerwartetes Ergebnis';
        bcObjectType = bcLookupTyp.Unbekannt;
        bcObjectInfos = bezeichnung;
        this.bcInfoToString({
          Gefunden: 'Unerwartetes Ergebnis',
          Objekt: LookupResultTable[result.lookupResultTable]
        });
    }

    const lastResult = {
      typ: bcObjectType,
      typToString: bcLookupTyp[ bcObjectType ],
      barcode: result.barcode,
      infos: bcObjectInfos,
      image: result.image,
      result
    };
    this.addHistoryResult(lastResult);

    if (result.image && result.image.mcuuid) {
      this.loadImageByMcuuid(result.image.mcuuid).then(img => {
        const lastResultFound = this.scanResultHistory.find( r => r === lastResult);
        if (lastResultFound) {
          lastResultFound.image.data_url = img.data_url;
        }
      });
    }
  }

  addHistoryResult(result: LookupResultItem): number {
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

  applyResult(result: LookupResultItem): void {
    console.log('BatchBarcodesComponent.applyHistoryResult(result: ', result, ') #335');
    const emitScanResult = {
      barcode: result.result.barcode,
      length: result.result.barcode.length,
      valid: true,
      result
    } as ScannerBarcodeData;
    console.log('BatchBarcodesComponent.applyHistoryResult(result: \', result, \') #335apply applyHistoryResult', { emitScanResult });
    result.ModalRaumUuid = this.raum.uuid;
    result.ModalJobid = this.jobid;
    this.onLookupResultApply.emit(result);
    // this.onScan.emit( emitScanResult );
  }

  clearHistory(): void {
    this.scanResultHistory = [];
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

  async loadImageByMcuuid(mcuuid: string): Promise<DBDIImages|null> {
    console.log('called loadImageByGcuuid', mcuuid);
    if (mcuuid) {
      return this.imageService.getImageByMcuuid(mcuuid)
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

  async refreshRaumProgress() {

    this.inventoryProgress.getCurrentRaumProgress(this.raum.uuid)
      .then( (progress: InventoryProgress) => {
        this.raumProgress.done = progress.done;
        this.raumProgress.total = progress.total;
      })
      .catch( err => {
        console.error( 'InventFormComponente #449 Fehler bei Raum-Progress-Aktualisierung', err );
      });
  }

  showRaumDone() {}
  showRaumRest() {}

}

