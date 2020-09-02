import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { faSearch, faCamera, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { DBDIRaeume} from '../../../dexie.service';
import { RaumService, RaumBasisDaten } from '../../data-services/raum.service';
import {Observable} from "rxjs";
import {debounceTime, distinctUntilChanged, filter, map} from "rxjs/operators";

@Component({
  selector: 'app-edit-raum',
  templateUrl: './edit-raum.component.html',
  styleUrls: ['./edit-raum.component.scss']
})
export class EditRaumComponent implements OnInit {
  closeResult: string;
  faSearch = faSearch;
  faCamera = faCamera;
  faSignOutAlt = faSignOutAlt;

  raumExistsStatus = -1;
  bezeichnungExistsStatus = -1;
  raumDaten: DBDIRaeume = null;
  etagen: string[] = [];
  validationErrors: string[] = [];

  public raumInput: RaumBasisDaten = {
    gid: 0,
    Raum: '',
    Raumbezeichnung: '',
    Etage: '',
    code: ''
  };

  formIsValid = false;
  formError = '';

  private rid: number;
  private gid: number;

  @Output() raumSearching = new EventEmitter<number>();
  @Output() raumChanged = new EventEmitter<DBDIRaeume>();
  @Output() scannerRequest = new EventEmitter<HTMLElement>();


  searchEtage = (text$: Observable<string>) => text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    filter(term => {
      return term.length >= 0;
    }),
    map(term => {
      // console.log('map and slice artikel by term', term, 'states', states);
      const matches = this.etagen
        .filter(item => new RegExp(term, 'mi').test(item) )
        .slice(0, 10);
      // console.log('search ', { term, matches, etagen: this.etagen });
      return matches;
    })
  )

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

  openScanner(target) {
    this.scannerRequest.emit(target);
  }

  formValidate(): boolean {
    console.log('called formValidate');
    this.validationErrors.length = 0;
    if (this.raumInput.code.trim().length > 0 && this.raumInput.code !== this.raumDaten.code) {
      if (this.raumService.codeExistsInInventur(
        this.raumDaten.for_jobid,
        this.raumDaten.rid,
        this.raumInput.code
      )) {
        this.validationErrors.push('Raum-Barcode ist bereits für einen anderen Raum vergeben!');
      }
    }
    if (this.raumInput.Raum.trim().length > 0 && this.raumInput.Raum.trim() !== this.raumDaten.Raum) {
      if (this.raumService.raumExistsInInventur(
        this.raumDaten.for_jobid,
        this.raumDaten.rid,
        this.raumInput.Raum
      )) {
        this.validationErrors.push('Raum-Name ist bereits für einen anderen Raum vergeben!');
      }
    }
    this.formIsValid =
      this.raumInput.Raum.length > 0
      && this.validationErrors.length === 0;

    console.log('called formValidate return ', this.formIsValid);
    return this.formIsValid;
  }

  get raumId() {
    console.log('called get raumId() ', this.rid);
    return this.rid;
  }

  set raumId(rid: number) {
    console.log( 'called set raumId', 'param', rid, 'old-rid', this.rid);
    this.raumService.get( rid ).then(raum => {
      this.raumDaten = raum;
      if (raum) {
        this.rid = raum.rid;
        for (const inputFld of Object.keys(this.raumInput) ) {
          this.raumInput[inputFld] = raum[inputFld];
        }
        console.log('#128 edit-raum.component.ts set raumId(rid: ' + rid + ')', { raum, raumInput: { ...this.raumInput}});
        this.etagen = [];
        this.raumService.getEtagenByGidInInventur(this.raumDaten.for_jobid, this.raumDaten.gid).then( (etagen) => {
          this.etagen = etagen;
        });
      } else {
        this.rid = 0;
      }
    }).catch( () => {
      this.raumDaten = null;
      this.rid = 0;
    });
  }

  async checkIfRaumExists(): Promise<boolean> {
    console.log('check if raum exists');
    this.raumExistsStatus = -1;
    let raumExists = false;
    await this.raumService
      .raumExists( this.gid, this.raumInput.Raum )
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
      .raumBezeichnungExists( this.gid, this.raumInput.Raumbezeichnung )
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
      console.log('save raumdaten ', this.raumInput);
      for (const col of Object.keys(this.raumDaten)) {

      }
      const result = await this.raumService.updateById( this.raumDaten.rid, this.raumInput );
      console.log('save raumdaten result ', result);
      if (!result.success) {
        this.formError = 'Daten konnten nicht aktualisiert werden!<br>' + result.errorMsg;
        return false;
      } else {
        this.raumChanged.emit( result.item );
        this.activeModal.close();
        return true;
      }
    } else {
      this.formError = 'Bitte die Angaben vervollständigen, Raum darf noch nicht vergeben sein';
    }
  }

  onSubmit(event) {
    console.log( 'onSubmit', this.raumInput );
    this.save();
  }
}
