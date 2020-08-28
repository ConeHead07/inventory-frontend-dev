import { Component, OnInit } from '@angular/core';
import {VariablesService} from '../../service/variables.service';
import {BasedataService} from '../../../basedata.service';
import {BarcodeService} from '../../../invent-form/data-services/barcode.service';
import {DBDIVariables, DexieService} from '../../../dexie.service';
import {SoundsService} from '../../../sounds.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  variableList: DBDIVariables[] = [];
  buildBcLookup = false;

  constructor(
    private dexieService: DexieService,
    private variables: VariablesService,
    private baseData: BasedataService,
    private barcodeLookup: BarcodeService,
    private sounds: SoundsService) {
  }

  ngOnInit() {
    this.reloadVariableList();
  }

  async reloadVariableList() {
    this.variableList = await this.variables.getAll();
  }

  async dbClear() {
    this.dexieService.delete();
    this.baseData.setCurrentInventur(null);
    this.baseData.setCurrentRaum(null);
    this.baseData.setCurrentGebaeude(null);
    this.baseData.setCurrentRaum(null);
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
    this.sounds.playSuccess();
  }

  async playError() {
    this.sounds.playError();
  }

}
