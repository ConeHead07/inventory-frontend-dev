import {Component, EventEmitter, OnInit, Output } from '@angular/core';

import {NgbModal, ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import {DBDIArtikel, DBDIObjektKatalogMandant} from '../../../dexie.service';
import { ArtikelService, ArtikelBasisDaten} from '../../data-services/artikel.service';

@Component({
  selector: 'app-select-create-artikel',
  templateUrl: './select-create-artikel.component.html',
  styleUrls: ['./select-create-artikel.component.scss']
})
export class SelectCreateArtikelComponent implements OnInit {
  closeResult: string;
  faSearch = faSearch;

  ArtikelExistsStatus = -1;
  bezeichnungExistsStatus = -1;

  public artikelDaten: ArtikelBasisDaten = {
    mid: 0,
    mcid: 0,
    gcid: 0,
    Bezeichnung: '',
    Typ: '',
    Hersteller: '',
    hid: 0,
    Groesse: '',
    Farbe: ''
  };

  formIsValid = false;
  formError = '';

  private gid: number;
  private mid: number;

  @Output() artikelSearching = new EventEmitter<number>();
  @Output() artikelCreated = new EventEmitter<DBDIArtikel>();

  constructor(
    // private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private artikelService: ArtikelService
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
      this.artikelDaten.Bezeichnung.length > 0
      && this.bezeichnungExistsStatus === 0;

    console.log('called formValidate return ', this.formIsValid);
    return this.formIsValid;
  }

  showSearchForm(event) {
    console.log('called showSearchForm');
    this.artikelSearching.emit(1);
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

  get clientId() {
    console.log('called get clientId() ', this.mid);
    return this.mid;
  }

  set clientId(mid: number) {
    console.log( 'called set clientId', 'param', mid, 'old-mid', this.mid);
    this.mid = mid;
  }

  async checkIfArtikelExistsGlobal(): Promise<boolean> {
    console.log('check if Artikel exists');
    this.bezeichnungExistsStatus = -1;
    let ArtikelExists = false;
    await this.artikelService
      .artikelExistsGlobal( this.artikelDaten.Bezeichnung )
      .then( exists => {
        this.bezeichnungExistsStatus = exists ? 1 : 0;
        ArtikelExists = exists;
      });
    this.formValidate();
    console.log('check if Artikel exists: ', ArtikelExists);
    return ArtikelExists;
  }

  async checkIfArtikelExistsMandant(): Promise<boolean> {
    console.log('check if bezeichnung exists');
    this.bezeichnungExistsStatus = -1;

    let globalArtikelIds: number[] = [];

    await this.artikelService
      .artikelGlobalByBezeichnung( this.artikelDaten.Bezeichnung )
      .then( items => {
        globalArtikelIds = items.map<number>( item => item.gcid );
      });

    if (globalArtikelIds.length === 0) {
      return false;
    }

    return 0 < await this.artikelService
      .artikelMcidByGcids( this.mid, globalArtikelIds )
      .then( items => {
        return items.length;
        // mandantArtikelIds = items.map<number>( itm => itm.mcid );
      });
  }

  async save(): Promise<boolean> {
    this.formError = '';
    console.log('save Artikel ');
    if (this.formValidate()) {
      this.artikelDaten.mid = this.mid;
      console.log('save Artikeldaten ', this.artikelDaten);
      const result = await this.artikelService.insert( this.artikelDaten );
      console.log('save Artikeldaten result ', result);
      if (!result.success) {
        this.formError = 'Daten konnten nicht gespeichert werden!<br>' + result.errorMsg;
        return false;
      } else {
        this.artikelCreated.emit( result.newItem );
        this.activeModal.close();
        return true;
      }
    } else {
      this.formError = 'Bitte die Angaben vervollständigen, Artikel darf noch nicht vergeben sein';
    }
  }

  onSubmit(event) {
    console.log( 'onSubmit', this.artikelDaten );
    this.save();
  }
}

