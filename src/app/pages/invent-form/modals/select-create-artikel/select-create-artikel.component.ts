import {Component, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import { ModalDismissReasons, NgbActiveModal, NgbTypeahead} from '@ng-bootstrap/ng-bootstrap';
import { faSearch, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import {DBDIArtikel, DBDIHersteller } from '../../../../shared/interfaces/dexie.interfaces';
import {
  ArtikelService,
  ArtikelBasisDaten,
  ArtikelPropertiesForQueryCount,
  ArtikelHerstellerImg, DBInsertArtikelResult
} from '../../data-services/artikel.service';

import {Observable, Subject, merge} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map} from 'rxjs/operators';
import {HerstellerService, HerstellerWithId} from '../../data-services/hersteller.service';
import {BasedataService} from '../../../../shared/services/basedata.service';
import {DataService} from '../../../../shared/services/data.service';
import {ArtikelOption} from '../select-search-artikel/select-search-artikel.component';
import {IndexableType} from 'dexie';


const states: HerstellerWithId[] = [];
const stateNames: string[] = [];
const artikelGruppen: string[] = [];
const artikelKategorien: string[] = [];
const artikelTypen: string[] = [];
const artikelGroessen: string[] = [];
const artikelFarben: string[] = [];
const gruppenKategorien: { gruppe: string, kategorien: string[]}[] = [];

export enum ArtikelFormType {
  Inventar,
  Kunst
}

interface FormControlOptions {
  isVisible: boolean;
  label: string;
  labelShort: string;
  placeholder: string;
}

interface ArtikelFormLabels {
  Hersteller: FormControlOptions; // string; // = 'Hersteller';
  Gruppe: FormControlOptions; // string; // = 'Gruppe';
  Kategorie: FormControlOptions; // string; // = 'Kategorie';
  Bezeichnung: FormControlOptions; // string; // = 'Bezeichnung';
  Typ: FormControlOptions; // string; // = 'Typ';
  Groesse: FormControlOptions; // string; // = 'Groesse';
  Farbe: FormControlOptions; // string; // = 'Farbe';
}

interface SimilarityStat {
  term: string;
  count: number;
}
interface ExistCountSimilarArticle {
  Hersteller: SimilarityStat;
  Bezeichnung: SimilarityStat;
  Typ: SimilarityStat;
  // Kategorie: SimilarityStat;
  Groesse: SimilarityStat;
  Farbe: SimilarityStat;
}

interface HerstellerExistsStatus {
  term?: string;
  uuid?: string;
  data?: DBDIHersteller;
  isQuerying: boolean;
}

@Component({
  selector: 'app-select-create-artikel',
  templateUrl: './select-create-artikel.component.html',
  styleUrls: ['./select-create-artikel.component.scss']
})
export class SelectCreateArtikelComponent implements OnInit {
  closeResult: string;
  faSearch = faSearch;
  faSignOutAlt = faSignOutAlt;

  ArtikelExistsStatus = -1;
  numBezeichnungExists = -1;

  public artikelDaten: ArtikelBasisDaten = {
    mid: 0,
    mcid: 0,
    mcuuid: '',
    gcid: 0,
    gcuuid: '',
    Bezeichnung: '',
    Gruppe: '',
    Kategorie: '',
    Typ: '',
    Hersteller: '',
    huuid: '',
    Groesse: '',
    Farbe: ''
  };
  model: any;

  @ViewChild('instance', {static: true}) instance: NgbTypeahead;
  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  @ViewChild('instanceGrp', {static: true}) instanceGrp: NgbTypeahead;
  focusGrp$ = new Subject<string>();
  clickGrp$ = new Subject<string>();

  @ViewChild('instanceKtg', {static: true}) instanceKtg: NgbTypeahead;
  focusKtg$ = new Subject<string>();
  clickKtg$ = new Subject<string>();

  @ViewChild('instanceTyp', {static: true}) instanceTyp: NgbTypeahead;
  focusTyp$ = new Subject<string>();
  clickTyp$ = new Subject<string>();

  @ViewChild('instanceGrs', {static: true}) instanceGrs: NgbTypeahead;
  focusGrs$ = new Subject<string>();
  clickGrs$ = new Subject<string>();

  @ViewChild('instanceFa', {static: true}) instanceFa: NgbTypeahead;
  focusFa$ = new Subject<string>();
  clickFa$ = new Subject<string>();

  formIsValid = false;
  formError = '';

  private gid: number;
  private mid: number;

  existsStatus: ExistCountSimilarArticle = {
    Hersteller: { term: '', count: 0 },
    Bezeichnung: { term: '', count: 0 },
    Typ: { term: '', count: 0 },
    Groesse: { term: '', count: 0 },
    Farbe: { term: '', count: 0 },
  };

  herstellerExistsStatus: HerstellerExistsStatus = {
    term: '',
    uuid: '',
    data: null,
    isQuerying: false
  };
  delayedTrigger: any = {};

  listExistingArticleMatches: ArtikelHerstellerImg[] = [];
  listExistingArticlePage: ArtikelHerstellerImg[] = [];
  pageSize = 8;
  collectionSize = 0;
  page = 1;
  maxSize = 6;

  @Output() artikelSelected = new EventEmitter<ArtikelOption>();
  @Output() artikelSearching = new EventEmitter<number>();
  @Output() artikelCreated = new EventEmitter<DBInsertArtikelResult>();
  @Output() herstellerChanged = new EventEmitter<string>();
  @Output() gruppeChanged = new EventEmitter<string>();
  @Output() inputChanging = new EventEmitter();
  @Output() inputChanged = new EventEmitter<Event>();

  formTitle = 'Neuen Artikel anlegen';

  formType: ArtikelFormType = ArtikelFormType.Inventar;
  formTypeInventar = ArtikelFormType.Inventar;
  formTypeKunst = ArtikelFormType.Kunst;

  formLabels: ArtikelFormLabels = {
    Hersteller: {
      isVisible: true,
      label: 'Hersteller',
      labelShort: 'HST',
      placeholder: 'Hersteller'
    },
    Gruppe: {
      isVisible: true,
      label: 'Gruppe',
      labelShort: 'GRP',
      placeholder: 'Gruppe'
    },
    Kategorie: {
      isVisible: true,
      label: 'Kategorie',
      labelShort: 'KTG',
      placeholder: 'Kategorie'
    },
    Bezeichnung: {
      isVisible: true,
      label: 'Bezeichnung',
      labelShort: 'BEZ',
      placeholder: 'Artikel-Bezeichnung'
    },
    Typ: {
      isVisible: true,
      label: 'Typ',
      labelShort: 'TYP',
      placeholder: 'Artikel-Typ'
    },
    Groesse : {
      isVisible: true,
      label: 'Groesse',
      labelShort: 'Größe',
      placeholder: 'Größe / Abmessungen'
    },
    Farbe: {
      isVisible: true,
      label: 'Farbe',
      labelShort: 'Farbe',
      placeholder: 'Artikelfarbe'
    }
  };
  formLabelsInventar: ArtikelFormLabels = this.formLabels;

  constructor(
    // private modalService: NgbModal,
    public activeModal: NgbActiveModal,
    private artikelService: ArtikelService,
    private herstellerService: HerstellerService,
    private baseData: BasedataService,
    private dataService: DataService
  ) {
  }

  ngOnInit() {
    this.herstellerService.getAllHerstellerWithUuids().then(list => {
      while (states.length > 0) {
        states.pop();
        stateNames.pop();
      }
      list.forEach( item =>  {
        states.push(item);
        stateNames.push(item.Hersteller);
      });
      console.log('#118 ngOnInit', { states, stateNames });
    });

    this.artikelService.getGroupedArtikelGruppenKategorien().then( (list) => {
      gruppenKategorien.length = 0;
      list.forEach( itm => gruppenKategorien.push(itm));
    });

    this.artikelService.getGroupedArtikelGruppen().then( list => {
      list.forEach( (it) => artikelGruppen.push( it ) );
    });

    this.artikelService.getGroupedArtikelKategorien().then( list => {
      list.forEach( (it) => artikelKategorien.push( it ) );
    });

    this.artikelService.getGroupedArtikelProperties('Typ').then( list => {
      list.forEach( (it) => artikelTypen.push( it ) );
    });

    this.artikelService.getGroupedArtikelFarben().then( list => {
      list.forEach( (it) => artikelFarben.push( it ) );
    });

    this.artikelService.getGroupedArtikelGroessen().then( list => {
      list.forEach( (it) => artikelGroessen.push( it ) );
    });

    this.herstellerChanged.subscribe( () => {
      this.checkHersteller().then( () => {
        this.inputChanged.emit();
        // this.rebuildTypeaheadGruppen();
        this.rebuildTypeaheadFarben();
        // this.rebuildTypeaheadKategorien();
        this.rebuildTypeaheadTypen();
      });
    });

    this.gruppeChanged.subscribe( (gruppe?: string) => {
      this.rebuildTypeaheadKategorien(gruppe);
      this.inputChanged.emit();
    });

    this.inputChanging.subscribe(() => {
      this.delegateListArticleMatches(3000);
    });

    this.inputChanged.subscribe(() => {
      // this.checkIfArtikelExistsGlobal();
      // this.checkIfArtikelExistsMandant();
      this.delegateListArticleMatches(500);
    });
  }

  setFormType(type: ArtikelFormType) {
    this.formType = type;
    if (type === ArtikelFormType.Inventar) {
      this.formTitle = 'Neuen Artikel anlegen';
      this.setInventarFormLabels();
    } else if (type === ArtikelFormType.Kunst) {
      this.formTitle = 'Neues Kunstobjekt anlegen';
      this.setKunstForm({ Kategorie: 'Kunst' });
    }
  }

  setInventarFormLabels() {
    for (const lbl in Object.keys(this.formLabelsInventar)) {
      if (this.formLabelsInventar.hasOwnProperty(lbl)) {
        this.formLabels[lbl].isVisible = this.formLabelsInventar[lbl].isVisible;
        this.formLabels[lbl].label = this.formLabelsInventar[lbl].label;
        this.formLabels[lbl].labelShort = this.formLabelsInventar[lbl].labelShort;
      }
    }
  }

  setKunstForm(vals?: ArtikelBasisDaten) {
    this.setKunstFormLabels();
    if (vals) {
      this.setFormValues(vals);
    }
  }

  setKunstFormLabels() {
    this.formLabels.Bezeichnung.label = 'Titel';
    this.formLabels.Bezeichnung.labelShort = 'Titel';
    this.formLabels.Bezeichnung.placeholder = 'Titel';
    this.formLabels.Typ.label = 'Künstler';
    this.formLabels.Typ.labelShort = 'Künstler';
    this.formLabels.Typ.placeholder = 'Künstler';
    this.artikelDaten.Kategorie = 'Kunst';
  }

  setFormValues(vals: ArtikelBasisDaten) {
    for (const fld in vals) {
      if (vals.hasOwnProperty(fld) && this.artikelDaten[fld]) {
        this.artikelDaten[fld] = vals[fld];
      }
    }
  }

  getWhereInputsOf(artikelProperties: string[]): any {
    const daten = { ...this.artikelDaten };
    console.log('#201 getWhereInputsOf', { artikelProperties, daten, artikelDaten: this.artikelDaten });
    const where = artikelProperties
      .filter( p => {
        const hasInput = (p in daten)
        && daten[p] !== 0
        && daten[p] !== ''
        && !!daten[p];
        console.log('#206 getWhereInputsOf', { p, hasInput, daten, artikelDaten: { ...this.artikelDaten},
          value: this.artikelDaten[p], dvalue: daten[p] });
        return hasInput;
      })
      .reduce( (o, p) => { o[p] = this.artikelDaten[p]; return o; }, {} as any);
    console.log('#210 getWhereInputsOf', { artikelProperties, where, artikelDaten: this.artikelDaten });
    return where;
  }

  async rebuildTypeaheadGruppen() {
    const where = this.getWhereInputsOf(['huuid']);
    this.artikelService.getGroupedArtikelGruppen(where).then( list => {
      artikelGruppen.length = 0;
      list.forEach( (it) => artikelGruppen.push( it ) );
    });
  }

  async rebuildTypeaheadKategorien(gruppe?: string) {
    const grpKategorien = gruppenKategorien.find( itm => itm.gruppe === gruppe);
    if (gruppe && grpKategorien && grpKategorien.kategorien.length) {
      artikelKategorien.length = 0;
      grpKategorien.kategorien.forEach( ktg => artikelKategorien.push( ktg ));
      return;
    }

    const buffer: string[] = [];
    gruppenKategorien.forEach( itm => {
      itm.kategorien.forEach( ktg => {
        if (ktg && artikelKategorien.indexOf(ktg) === -1) {
          buffer.push( ktg );
        }
      });
    });

    artikelKategorien.length = 0;
    buffer.sort( (a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
      .forEach( ktg => artikelKategorien.push( ktg ));
    return;
  }

  async rebuildTypeaheadTypen() {
    const where = this.getWhereInputsOf(['huuid']);
    this.artikelService.getGroupedArtikelTypen(where).then( list => {
      artikelTypen.length = 0;
      list.forEach( (it) => artikelTypen.push( it ) );
    });
  }

  async rebuildTypeaheadGroessen() {
    const where = this.getWhereInputsOf(['huuid']);
    this.artikelService.getGroupedArtikelGroessen(where).then( list => {
      artikelGroessen.length = 0;
      list.forEach( (it) => artikelGroessen.push( it ) );
    });
  }

  async rebuildTypeaheadFarben() {
    const where = this.getWhereInputsOf(['huuid']);
    this.artikelService.getGroupedArtikelFarben(where).then( list => {
      artikelFarben.length = 0;
      list.forEach( (it) => artikelFarben.push( it ) );
    });
  }

  async delegateCheckHersteller() {
    const funcName = 'checkHersteller';
    const delayMS = 1000;
    if (funcName in this.delayedTrigger) {
      clearTimeout( this.delayedTrigger[funcName] );
      delete this.delayedTrigger[funcName];
    }

    console.log('delegate checkHersteller');
    this.delayedTrigger[funcName] = setTimeout( this.checkHersteller.bind(this), delayMS );
  }

  async delegateListArticleMatches(delay?: number) {
    const funcName = 'listArticleMatches';
    const delayMS = isNaN(delay) ? 2000 : delay;
    if (funcName in this.delayedTrigger) {
      clearTimeout( this.delayedTrigger[funcName] );
      delete this.delayedTrigger[funcName];
    }

    console.log('delegate listArticleMatches');
    this.delayedTrigger[funcName] = setTimeout( this.listArticleMatches.bind(this), delayMS );
  }

  async checkHersteller(): Promise<boolean> {
    console.log('called checkHersteller');
    const input = this.artikelDaten.Hersteller;
    const term = (typeof input === 'string') ? input.trim() : '';

    if (term !== this.herstellerExistsStatus.term) {
      this.herstellerExistsStatus.term = term;
      this.herstellerExistsStatus.data = null;
      this.herstellerExistsStatus.uuid = null;
    }

    if (term.length) {
      this.herstellerExistsStatus.isQuerying = true;
      return await this.herstellerService.getByName( term ).then( (data) => {
        this.herstellerExistsStatus.data = data;
        this.herstellerExistsStatus.isQuerying = false;
        if (data !== null && data !== undefined) {
          this.herstellerExistsStatus.uuid = ('uuid' in data) ? data.uuid : null;
          console.log('#167 Hersteller exists: ', this.herstellerExistsStatus);
          return true;
        }
        return false;
      });
    }
    console.log('#172 Hersteller not found: ', term);
    return false;
  }

  async listArticleMatches() {
    console.log('#175 called listArticleMatches');
    const mid = this.baseData.getCurrentMid();
    const oInputStatus = this.existsStatus;
    const d = this.artikelDaten;
    const oCheckData: ArtikelPropertiesForQueryCount = {};

    await this.checkHersteller();
    const huuid = this.herstellerExistsStatus.uuid;

    for (const k of ['Bezeichnung', 'Typ', 'Kategorie', 'Gruppe', 'Groesse', 'Farbe']) {
      if (d[k]) {
        oCheckData[k] = d[k];
      }
    }

    this.listExistingArticleMatches = await this.artikelService.listArticleByProperties(mid, huuid, oCheckData);
    this.page = 1;
    this.onPageChange(this.page);
    console.log('finished listArticleMatches with results.count: ', this.listExistingArticleMatches.length,
      ' for', { mid, huuid, oCheckData } );
  }

  async applyItemAsArtikel(item: any) {
    console.log('#361 applyItemAsArtikel', { item });
    if (!item.mcuuid) {
      let artikelRef = await this.dataService.getArtikelRefByGcuuidMid(item.gcuuid, this.clientId);
      if (!artikelRef) {
        artikelRef = await this.artikelService.insertArtikelRef(item);
      }
      item.mcid = artikelRef.mcid;
      item.mcuuid = artikelRef.uuid;
    }
    this.artikelSelected.emit({
      uuid: item.mcuuid,
      mcuuid: item.mcuuid,
      name: item.Bezeichnung
    } as ArtikelOption);
    return;
  }

  applyItemAsInput(item: any) {
    console.log('#367 applyItemAsInput', { item });
    this.artikelDaten.Hersteller = item.Hersteller;
    this.artikelDaten.huuid = item.huuid;
    this.artikelDaten.Bezeichnung = item.Bezeichnung;
    this.artikelDaten.Gruppe = item.Gruppe;
    this.artikelDaten.Kategorie = item.Kategorie;
    this.artikelDaten.Farbe = item.Farbe;
    this.artikelDaten.Groesse = item.Groesse;
    this.artikelDaten.Typ = item.Typ;
    return;
  }

  formatter = (state: string) => state;

  search = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instance === 'object' && this.instance instanceof NgbTypeahead)
      ? this.instance.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? stateNames
        : stateNames.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchGruppen = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instanceGrp === 'object' && this.instanceGrp instanceof NgbTypeahead)
      ? this.instanceGrp.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickGrp$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focusGrp$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelGruppen
        : artikelGruppen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchKategorien = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instanceKtg === 'object' && this.instanceKtg instanceof NgbTypeahead)
      ? this.instanceKtg.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickKtg$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focusKtg$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelKategorien
        : artikelKategorien.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchTypen = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instanceTyp === 'object' && this.instanceTyp instanceof NgbTypeahead)
      ? this.instanceTyp.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickTyp$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focusTyp$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelTypen
        : artikelTypen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchGroessen = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instanceGrs === 'object' && this.instanceGrs instanceof NgbTypeahead)
      ? this.instanceGrs.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickGrs$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focusGrs$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelGroessen
        : artikelGroessen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchFarben = (text$: Observable<string>) => {
    const isPopupOpen = (typeof this.instanceFa === 'object' && this.instanceFa instanceof NgbTypeahead)
      ? this.instanceFa.isPopupOpen()
      : false;
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickFa$.pipe(filter(() => !isPopupOpen));
    const inputFocus$ = this.focusFa$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelFarben
        : artikelFarben.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  onInput(event?: Event) {
    this.inputChanging.emit(event);
  }

  onChange(event?: Event) {
    this.inputChanged.emit(event);
  }

  onSelectHersteller(selected) {
    const foundHst = states.find( (st) => st.Hersteller === selected.item);
    this.artikelDaten.huuid = (foundHst) ? foundHst.uuid : null;
    console.log('SelectCreateArtikel onSelectHersteller this.artikelDaten.Hersteller: ', this.artikelDaten.Hersteller,
      { selected, foundHst });
    this.herstellerChanged.emit(selected.item);
  }
  onChangeHersteller(event: Event) {
    console.log('Hersteller changed', event);
    if (event.target instanceof HTMLInputElement) {
      this.herstellerChanged.emit((event.target as HTMLInputElement).value);
    }
  }

  onSelectGruppe(selected) {
    console.log('Gruppe selected', selected);
    this.gruppeChanged.emit(selected.item);
  }
  onChangeGruppe(event: Event) {
    console.log('Gruppe changed', event);
    if (event.target instanceof HTMLInputElement) {
      this.gruppeChanged.emit((event.target as HTMLInputElement).value);
    }
  }

  onSelectKategorie(selected) {
    console.log('Kategorien selected', selected);
    this.inputChanged.emit();
  }
  onChangeKategorie(event) {
    console.log('Kategorien changed', event);
    this.inputChanged.emit(event);
  }

  onSelectTypen(selected) {
    console.log('Typen selected', selected);
    this.inputChanged.emit();
  }
  onChangeTyp(event) {
    console.log('Typ changed', event);
    this.inputChanged.emit(event);
  }

  onSelectFarben(selected) {
    console.log('Farben selected', selected);
    this.inputChanged.emit();
  }

  onSelectGroessen(selected) {
    console.log('Groessen selected', selected);
    this.inputChanged.emit();
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }

  formValidate(): boolean {
    this.formIsValid =
      this.artikelDaten.Bezeichnung.length > 0
      && this.numBezeichnungExists === 0;

    console.log('called formValidate return ', this.formIsValid);
    return this.formIsValid;
  }

  showSearchForm(event) {
    this.artikelSearching.emit(1);
    this.activeModal.close();
  }

  get gebaeudeId() {
    return this.gid;
  }

  set gebaeudeId(gid: number) {
    this.gid = gid;
  }

  get clientId() {
    return this.mid;
  }

  set clientId(mid: number) {
    this.mid = mid;
  }

  async checkIfABezeichnungExistsGlobal(): Promise<number> {
    this.delegateListArticleMatches();
    this.numBezeichnungExists = -1;
    const jobid = this.baseData.getCurrentJobid();
    const numExists = await this.artikelService
      .artikelBezeichnungExistsGlobal( this.artikelDaten.Bezeichnung, jobid );
    this.numBezeichnungExists = numExists;
    this.formValidate();
    console.log('check if Artikel exists: ', numExists, 'this.numBezeichnungExists', this.numBezeichnungExists);
    this.listArticleMatches();
    return numExists;
  }

  async checkIfArtikelExistsMandant(): Promise<boolean> {
    this.numBezeichnungExists = -1;

    let globalArtikelUuids: string[] = [];

    await this.artikelService
      .artikelGlobalByBezeichnung( this.artikelDaten.Bezeichnung )
      .then( items => {
        globalArtikelUuids = items.map<string>( item => item.uuid );
      });

    if (globalArtikelUuids.length === 0) {
      this.numBezeichnungExists = 0;
      return false;
    }

    const numExistsByMandant = await this.artikelService
      .artikelMcuuidByGcuuids( this.mid, globalArtikelUuids )
      .then( items => {
        return items.length;
      });

    this.numBezeichnungExists = numExistsByMandant;

    return numExistsByMandant > 0;
  }

  async save(): Promise<boolean> {
    this.formError = '';
    if (this.formValidate()) {
      this.artikelDaten.mid = this.mid;
      const result: DBInsertArtikelResult = await this.artikelService.insert( this.artikelDaten );
      if (!result.success) {
        this.formError = 'Daten konnten nicht gespeichert werden!<br>' + result.errorMsg;
        console.error('save Artikeldaten result ', { artikelDaten: this.artikelDaten, result});
        return false;
      } else {
        this.artikelCreated.emit( result );
        this.activeModal.close();
        return true;
      }
    } else {
      this.formError = 'Bitte die Angaben vervollständigen, Artikel-Bezeichnung darf noch nicht vergeben sein';
    }
  }

  onPageChange(page: number) {
    this.collectionSize = this.listExistingArticleMatches.length;
    this.pageSize = 8;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.listExistingArticlePage = this.listExistingArticleMatches.slice(start, end);
    console.log('#599 pagination goto page', page, '.slice(', start, end, ') of', this.collectionSize);
  }

  onSubmit(event) {
    console.log( 'onSubmit', this.artikelDaten );
    this.save();
  }
}

