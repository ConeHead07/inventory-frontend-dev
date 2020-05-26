import { Component, OnInit } from '@angular/core';
import {VariablesService} from '../../service/variables.service';
import {BasedataService} from '../../../basedata.service';
import {BarcodeService} from '../../../invent-form/data-services/barcode.service';
import {DBDIVariables} from '../../../dexie.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  variableList: DBDIVariables[] = [];
  buildBcLookup = false;

  constructor(
    private variables: VariablesService,
    private baseData: BasedataService,
    private barcodeLookup: BarcodeService) {
  }

  ngOnInit() {
    this.reloadVariableList();
  }

  async reloadVariableList() {
    this.variableList = await this.variables.getAll();
  }

  async reIndexBarcodeLookup() {
    this.buildBcLookup = true;
    this.barcodeLookup.rebuildOnRunningSystem().then( (result) => {
      console.log('Finished BC-Lookup-Rebuild', { result });
    }).catch( (err) => {
      console.error(err);
    }).finally( () => {
      this.buildBcLookup = false;
    });
    this.reloadVariableList();
  }

}
