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

  typeofLookupInventar = bcLookupTyp[bcLookupTyp.Inventar];
  typeofLookupRaum = bcLookupTyp[bcLookupTyp.Raum];
  typeofLookupArtikel = bcLookupTyp[bcLookupTyp.Artikel];
  typeofLookupNeu = bcLookupTyp[bcLookupTyp.Neu];

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
    private baseData: BasedataService
  ) {}

    ngOnInit(): void {}

    ngOnDestroy() {}
}
