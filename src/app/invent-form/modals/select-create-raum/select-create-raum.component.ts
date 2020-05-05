import {Component, EventEmitter, OnInit, Output } from '@angular/core';

import {NgbModal, ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import {DBDIRaeume} from '../../../dexie.service';
import { RaumService, RaumBasisDaten } from '../../data-services/raum.service';



@Component({
  selector: 'app-select-create-raum',
  templateUrl: './select-create-raum.component.html',
  styleUrls: ['./select-create-raum.component.scss']
})
export class SelectCreateRaumComponent implements OnInit {
  closeResult: string;
  faSearch = faSearch;

  raumExistsStatus = -1;
  bezeichnungExistsStatus = -1;

  public raumDaten: RaumBasisDaten = {
    Raum: '',
    Raumbezeichnung: '',
    Etage: ''
  };

  formIsValid = false;
  formError = '';

  private gid: number;

  @Output() raumSearching = new EventEmitter<number>();
  @Output() raumCreated = new EventEmitter<DBDIRaeume>();

  constructor(
    // private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private raumService: RaumService
  ) {}

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }

  ngOnInit() {
  }

  formValidate(): boolean {
    console.log('called formValidate');
    this.formIsValid =
      this.raumDaten.Raum.length > 0
      && this.raumExistsStatus === 0;

    console.log('called formValidate return ', this.formIsValid);
    return this.formIsValid;
  }

  showSearchForm(event) {
    console.log('called showSearchForm');
    this.raumSearching.emit(1);
    this.activeModal.close();
  }

  get gebaeudeId() {
    console.log('called get gebaeudeId() ', this.gid);
    return this.gid;
  }

  set gebaeudeId(gid: number) {
    console.log( 'called set gebaeudeId', 'param', gid, 'old-gid', this.gid);
    this.gid = gid;
  }

  async checkIfRaumExists(): Promise<boolean> {
    console.log('check if raum exists');
    this.raumExistsStatus = -1;
    let raumExists = false;
    await this.raumService
      .raumExists( this.gid, this.raumDaten.Raum )
      .then( exists => {
        this.raumExistsStatus = exists ? 1 : 0;
        raumExists = exists;
    });
    this.formValidate();
    console.log('check if raum exists: ', raumExists);
    return raumExists;
  }

  async checkIfRaumbezeichnungExists(): Promise<boolean> {
    console.log('check if bezeichnung exists');
    this.bezeichnungExistsStatus = -1;
    let bezeichnungExists = false;
    await this.raumService
      .raumBezeichnungExists( this.gid, this.raumDaten.Raumbezeichnung )
      .then( exists => {
        this.bezeichnungExistsStatus = exists ? 1 : 0;
        bezeichnungExists = exists;
    });
    console.log('check if bezeichnung exists: ', bezeichnungExists);
    return bezeichnungExists;
  }

  async save(): Promise<boolean> {
    this.formError = '';
    console.log('save raum ');
    if (this.formValidate()) {
      this.raumDaten.gid = this.gid;
      console.log('save raumdaten ', this.raumDaten);
      const result = await this.raumService.insert( this.raumDaten );
      console.log('save raumdaten result ', result);
      if (!result.success) {
        this.formError = 'Daten konnten nicht gespeichert werden!<br>' + result.errorMsg;
        return false;
      } else {
        this.raumCreated.emit( result.newItem );
        this.activeModal.close();
        return true;
      }
    } else {
      this.formError = 'Bitte die Angaben vervollständigen, Raum darf noch nicht vergeben sein';
    }
  }

  onSubmit(event) {
    console.log( 'onSubmit', this.raumDaten );
    this.save();
  }
}
