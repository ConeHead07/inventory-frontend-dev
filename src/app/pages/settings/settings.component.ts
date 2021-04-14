import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {VariablesService} from '../../shared/services/variables.service';
import {BasedataService} from '../../shared/services/basedata.service';
import {BarcodeService} from '../invent-form/data-services/barcode.service';
import {DBDIVariables} from '../../shared/interfaces/dexie.interfaces';
import {DexieService} from '../../shared/services/dexie.service';
import {SoundsService} from '../../shared/services/sounds.service';
import {ScanDetectData} from '../../shared/components/scannerdetection/scannerdetection.component';
import Dexie from "dexie";
import {Router} from "@angular/router";


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
  private blobAlertTimer = null;

  @Output() changedManualBCInput = new EventEmitter<boolean>();

  constructor(
    private dexieService: DexieService,
    private variables: VariablesService,
    private baseData: BasedataService,
    private barcodeLookup: BarcodeService,
    private sounds: SoundsService,
    private router: Router) {
    this.dbName = this.dexieService.name;
    this.dbVersion = this.dexieService.verno;

  }

  ngOnInit() {
    this.reloadVariableList();

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
