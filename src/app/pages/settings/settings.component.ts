import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {VariablesService} from '../../shared/services/variables.service';
import {BasedataService} from '../../shared/services/basedata.service';
import {BarcodeService} from '../invent-form/data-services/barcode.service';
import {
  DBDIHersteller, DBDIImages,
  DBDIObjektKatalogGlobal, DBDIObjektKatalogImages,
  DBDIObjektKatalogMandant,
  DBDIVariables
} from '../../shared/interfaces/dexie.interfaces';
import {DexieService} from '../../shared/services/dexie.service';
import {SoundsService} from '../../shared/services/sounds.service';
import {ScanDetectData} from '../../shared/components/scannerdetection/scannerdetection.component';
import Dexie from 'dexie';
import {Router} from '@angular/router';
import {DbexportService} from '../../shared/services/dbexport.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  variableList: DBDIVariables[] = [];
  buildBcLookup = false;
  enableManualBCInput: boolean;
  useOverlay = 0;
  blobAlert?: string;
  dbName: string;
  dbVersion: number;
  currentInventurId: number;
  currentInventurTitle: string;

  exportProcessing = false;
  exportProgress = 0;
  exportFinished = false;
  exportCurrent = 0;
  exportTotal = 0;
  exportStatus = '';

  private blobAlertTimer = null;

  @Output() changedManualBCInput = new EventEmitter<boolean>();

  constructor(
    private dexieService: DexieService,
    private variables: VariablesService,
    private baseData: BasedataService,
    private barcodeLookup: BarcodeService,
    private sounds: SoundsService,
    private router: Router,
    private dbexportService: DbexportService) {
    this.dbName = this.dexieService.name;
    this.dbVersion = this.dexieService.verno;
  }

  ngOnInit() {
    this.reloadVariableList();
    this.currentInventurId = this.baseData.getCurrentJobid();
    const inventur = this.baseData.getCurrentInventur();
    this.currentInventurTitle = inventur.Titel;

    this.variables.get('manualBarcodeInput', false).then( (val) => {
      this.enableManualBCInput = !!val;
    });
  }

  async reloadVariableList() {
    this.variableList = await this.variables.getAll();
  }

  async changeManualBCInput(event) {
    console.log('changeManualBCInput', { event });
    this.variables.set('manualBarcodeInput', this.enableManualBCInput);
    this.changedManualBCInput.emit( this.enableManualBCInput);
  }

  async syncExport() {
    this.dbexportService.exportTable('clientChangeLog');
    // this.dbexportService.exportTable('inventar');
  }

  async getHerstellerListByJobid(jobid: number): Promise<DBDIHersteller[]> {
    const db = this.dexieService;
    const hstList: DBDIHersteller[] = [];
    const hstUuuids: string[] = [];
    return db.transaction('r', [ db.objektKatalogMandant, db.objektKatalogGlobal, db.hersteller ], async() => {
      await db.objektKatalogMandant.each((mRow) => {
        db.objektKatalogGlobal.where({uuid: mRow.gcuuid}).first().then(gRow => {
          if (gRow && gRow.huuid && hstUuuids.indexOf(gRow.huuid) === -1) {
            return db.hersteller.where({uuid: gRow.huuid}).first().then(hst => {
              hstList.push(hst);
              hstUuuids.push(gRow.huuid);
            });
          }
        });
      });
    }).then( () => {
      return hstList;
    }).catch(() => []);
  }

  async getImageUuidsByJobid(jobid: number): Promise<string[]> {
    const db = this.dexieService;
    const imgUuids: string[] = [];
    return db.transaction('r',
      [ db.images, db.objektKatalogImages ],
      async () => {
        await db.images.where({for_jobid: jobid}).each((img) => {
          imgUuids.push(img.uuid);
        });
        await db.objektKatalogImages.where({for_jobid: jobid}).each(imgRef => {
          if (imgUuids.indexOf(imgRef.ImgUuid) === -1) {
            imgUuids.push(imgRef.ImgUuid);
          }
        });
      })
      .then( () => imgUuids)
      .catch( () => []);
  }

  async getKatalogListByJobid(jobid: number): Promise<DBDIObjektKatalogGlobal[]> {
    const db = this.dexieService;
    const list: DBDIObjektKatalogGlobal[] = [];
    return db.transaction('r',
      [ db.objektKatalogMandant, db.objektKatalogGlobal ],
      async () => {
      await db.objektKatalogMandant.each((mRow) => {
        db.objektKatalogGlobal.where({uuid: mRow.gcuuid}).first().then(gRow => {
          if (gRow && gRow.uuid) {
            list.push(gRow);
          }
        });
      });
    })
      .then( () => list)
      .catch( () => []);
  }

  async inventurExport() {
    const jobid = this.baseData.getCurrentJobid();
    const exp = this.dbexportService;
    const db = this.dexieService;
    const zip = exp.createZip();

    this.exportProcessing = true;

    this.exportProcessing = true;
    this.exportStatus = '';
    this.exportTotal = 9;
    this.exportCurrent = 0;
    this.exportFinished = false;
    this.exportProgress = 0;

    const numClg = await db.clientChangeLog.where({jobid}).count();
    this.exportStatus = 'Exportiere ' + numClg + ' ClientChangeLog';
    console.log(this.exportStatus);
    await exp.addCollectionToZip(
      db.clientChangeLog.where({jobid}),
      'clientChangeLog',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const numInv = await db.inventar.where({jobid}).count();
    this.exportStatus = 'Exportiere ' + numInv + ' Inventar';
    console.log(this.exportStatus);
    await exp.addCollectionToZip(
      db.inventar.where({jobid}),
      'inventar',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const numRm = await db.raeume.where({for_jobid: jobid}).count();
    this.exportStatus = 'Exportiere ' + numRm + ' Räume';
    console.log(this.exportStatus);
    await exp.addCollectionToZip(
      db.raeume.where({for_jobid: jobid}),
      'raeume',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const numOki = await db.objektKatalogImages.where({for_jobid: jobid}).count();
    this.exportStatus = 'Exportiere ' + numOki + ' ObjektKatalogImages (Bild-Referenzen)';
    console.log(this.exportStatus);
    await exp.addCollectionToZip(
      db.objektKatalogImages.where({for_jobid: jobid}),
      'objektKatalogImages',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const hstList = await this.getHerstellerListByJobid(jobid);
    this.exportStatus = 'Exportiere ' + hstList.length + ' Hersteller';
    console.log(this.exportStatus);
    exp.addArrayToZip<DBDIHersteller>(
      hstList,
      'hersteller',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const okgList = await this.getKatalogListByJobid(jobid);
    this.exportStatus = 'Exportiere ' + okgList.length + ' ObjektKatalogGlobal (Katalog)';
    console.log(this.exportStatus);
    exp.addArrayToZip<DBDIObjektKatalogGlobal>(
      okgList,
      'objektKatalogGlobal',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const numOkm = await db.objektKatalogMandant.where({for_jobid: jobid}).count();
    this.exportStatus = 'Exportiere ' + numOkm + ' ObjektKatalogMandant (Katalog-Referenzen)';
    console.log(this.exportStatus);
    await exp.addCollectionToZip<DBDIObjektKatalogMandant, unknown>(
      await db.objektKatalogMandant.where({for_jobid: jobid}),
      'objektKatalogMandant',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const imgUuids = await this.getImageUuidsByJobid(jobid);
    const numImgs = await db.images.where('uuid').anyOf(imgUuids).count();
    this.exportStatus = 'Exportiere ' + numImgs + ' Images (Bild-DB)';
    console.log(this.exportStatus);
    await exp.addCollectionToZip<DBDIImages, unknown>(
      await db.images.where('uuid').anyOf(imgUuids),
      'images',
      zip
    );
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;

    const dt = new Date();
    const yy = dt.getFullYear().toString(10);
    const m = dt.getMonth() + 1;
    const mm = (m < 10) ? '0' + m.toString(10) : m.toString(10);
    const d = dt.getDate();
    const dd = (d < 10) ? '0' + d.toString(10) : d.toString(10);
    const tt = dt.toLocaleTimeString().split(':').join('');
    const timestamp = yy + mm + dd + '_' + tt;
    const zipFile = 'Inventur_' + jobid + '_' + timestamp + '.zip';

    this.exportStatus = 'Erstelle ZipFile für Download';
    console.log(this.exportStatus);
    exp.exportZip(zip, zipFile);
    this.exportCurrent++;
    this.exportProgress = this.exportCurrent * 100 / this.exportTotal;
    setTimeout( () => { this.exportProcessing = false; }, 3000);
  }

  async dbClear() {
    this.baseData.setCurrentInventur(null);
    this.baseData.setCurrentRaum(null);
    this.baseData.setCurrentGebaeude(null);
    this.baseData.setCurrentRaum(null);
    await this.dexieService.clearDB();
    this.router.navigate(['/select-inventory']);
  }

  async dbDelete() {
    this.baseData.setCurrentInventur(null);
    this.baseData.setCurrentRaum(null);
    this.baseData.setCurrentGebaeude(null);
    this.baseData.setCurrentRaum(null);
    await this.dexieService.deleteDB();
    this.router.navigate(['/select-inventory']);
  }

  async reIndexBarcodeLookup() {
    this.buildBcLookup = true;
    console.log('Start rebuildOnRunningSystem');
    this.barcodeLookup.rebuildOnRunningSystem().then( (result) => {
      console.log('Finished BC-Lookup-Rebuild', { result });
    }).catch( (err) => {
      console.error(err);
    }).finally( () => {
      this.buildBcLookup = false;
    });
    this.reloadVariableList();
  }

  async playSuccess() {
    this.showBlobAlertSuccess();
    this.sounds.playSuccess();
  }

  async playError() {
    this.showBlobAlertError();
    this.sounds.playError();
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

}
