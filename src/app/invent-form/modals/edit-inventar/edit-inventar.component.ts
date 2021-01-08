import { Component, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';

import { ModalDismissReasons, NgbActiveModal, NgbTypeahead} from '@ng-bootstrap/ng-bootstrap';
import { faCamera, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { DBDIArtikel, DBDIHersteller, DBDIInventar, DBDIRaeume} from '../../../dexie.interfaces';
import {InventarService, InventarBasisDaten, InventarFoundResult} from '../../data-services/inventar.service';
import {merge, Observable, Subject} from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ArtikelOption} from '../select-search-artikel/select-search-artikel.component';
import {HerstellerService, HerstellerWithId} from '../../data-services/hersteller.service';
import {
  ArtikelHerstellerImg,
  ArtikelPropertiesForQueryCount,
  ArtikelService
} from '../../data-services/artikel.service';
import {BasedataService} from '../../../basedata.service';
import {DataService} from '../../../inventory/service/data.service';

const states: HerstellerWithId[] = [];
const stateNames: string[] = [];
const artikelGruppen: string[] = [];
const artikelKategorien: string[] = [];
const artikelTypen: string[] = [];
const artikelGroessen: string[] = [];
const artikelFarben: string[] = [];
const gruppenKategorien: { gruppe: string, kategorien: string[]}[] = [];

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
  hid?: number;
  uuid?: string;
  data?: DBDIHersteller;
  isQuerying: boolean;
}

@Component({
  selector: 'app-edit-inventar',
  templateUrl: './edit-inventar.component.html',
  styleUrls: ['./edit-inventar.component.scss']
})
export class EditInventarComponent implements OnInit {

  @Output() artikelSelected = new EventEmitter<ArtikelOption>();
  @Output() artikelSearching = new EventEmitter<number>();
  @Output() artikelCreated = new EventEmitter<DBDIArtikel>();
  @Output() herstellerChanged = new EventEmitter<string>();
  @Output() gruppeChanged = new EventEmitter<string>();
  @Output() inputChanging = new EventEmitter();
  @Output() inputChanged = new EventEmitter<Event>();
  @Output() inventarChanged = new EventEmitter<InventarFoundResult>();
  @Output() scannerRequest = new EventEmitter<HTMLElement>();

  faSignOutAlt = faSignOutAlt;
  faCamera = faCamera;

  numBezeichnungExists = -1;

  closeResult: string;
  inventarDaten: InventarFoundResult = null;
  public inventarInput: InventarBasisDaten = {
    code: '',
    ivid: 0,
    Bezeichnung: '',
    Gruppe: '',
    Kategorie: '',
    Typ: '',
    Hersteller: '',
    Groesse: '',
    Farbe: '',
  };

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

  existsStatus: ExistCountSimilarArticle = {
    Hersteller: { term: '', count: 0 },
    Bezeichnung: { term: '', count: 0 },
    Typ: { term: '', count: 0 },
    Groesse: { term: '', count: 0 },
    Farbe: { term: '', count: 0 },
  };

  herstellerExistsStatus: HerstellerExistsStatus = {
    term: '',
    hid: 0,
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

  public validationErrors: string[] = [];
  public formIsValid = true;
  public formError = '';
  private id = 0;

  private gid: number;
  private mid: number;

  constructor(
    public activeModal: NgbActiveModal,
    public inventarService: InventarService,
    private artikelService: ArtikelService,
    private herstellerService: HerstellerService,
    private baseData: BasedataService,
    private dataService: DataService ) { }

    async loadHersteller(): Promise<number> {
      return this.herstellerService.getAllHerstellerWithIds()
        .then( list => {
          while (states.length > 0) {
            states.pop();
            stateNames.pop();
          }
          list.forEach( item =>  {
            states.push(item);
            stateNames.push(item.Hersteller);
          });
          console.log('#118 ngOnInit', { states, stateNames });
          return states.length;
        })
        .catch( () => -1);
    }

    async loadGruppenKategorien(): Promise<number> {
      return this.artikelService.getGroupedArtikelGruppenKategorien()
        .then( (list) => {
          gruppenKategorien.length = 0;
          list.forEach( itm => gruppenKategorien.push(itm));
          return gruppenKategorien.length;
        })
        .catch( () => -1);
    }

    async loadGruppen(): Promise<number> {
      return this.artikelService.getGroupedArtikelGruppen()
        .then( list => {
          artikelGruppen.length = 0;
          list.forEach( (it) => artikelGruppen.push( it ) );
          return artikelGruppen.length;
        })
        .catch( () => -1);
    }

    async loadKategorien(): Promise<number> {
      return this.artikelService.getGroupedArtikelKategorien()
        .then( list => {
          artikelKategorien.length = 0;
          list.forEach( (it) => artikelKategorien.push( it ) );
          return artikelKategorien.length;
        })
        .catch( () => -1);
    }

    async loadArtikeltypen(): Promise<number> {
      return this.artikelService.getGroupedArtikelProperties('Typ')
        .then( list => {
          artikelTypen.length = 0;
          list.forEach( (it) => artikelTypen.push( it ) );
          return artikelTypen.length;
        })
        .catch( () => -1);
    }

    async loadFarben(): Promise<number> {
      return this.artikelService.getGroupedArtikelFarben()
        .then( list => {
          artikelFarben.length = 0;
          list.forEach( (it) => artikelFarben.push( it ) );
          return artikelFarben.length;
        })
        .catch( () => -1);
    }

    async loadGroessen(): Promise<number> {
      return this.artikelService.getGroupedArtikelGroessen()
        .then( list => {
          artikelGroessen.length = 0;
          list.forEach( (it) => artikelGroessen.push( it ) );
          return artikelGroessen.length;
        })
        .catch( () => -1);
    }

  ngOnInit() {
    this.mid = this.baseData.getCurrentMid();
    Promise.all([
      this.loadHersteller(),
      this.loadGruppenKategorien(),
      this.loadGruppen(),
      this.loadKategorien(),
      this.loadArtikeltypen(),
      this.loadFarben(),
      this.loadGroessen()
    ])
      .then( (result) => {
        console.log('loaded all ArtikelData', {
          result,
          states,
          stateNames,
          artikelTypen,
          'gruppenKategorien.length': gruppenKategorien.length,
          'artikelGruppen.length': artikelGruppen.length,
          'artikelKategorien.length': artikelKategorien.length,
          'artikelTypen.length': artikelTypen.length,
          'artikelFarben.length': artikelFarben.length,
          'artikelGroessen.length': artikelGroessen.length
        });
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
      this.checkIfArtikelExistsMandant();
      this.delegateListArticleMatches(500);
    });
  }

  openScanner(target) {
    this.scannerRequest.emit(target);
  }

  get inventarId() {
    console.log('called get raumId() ', this.id);
    return this.id;
  }

  set inventarId(id: number) {
    this.id = id;
    this.inventarService.getInventar(id).then( result => {
      this.inventarDaten = result;
      if (result && result.success) {
        this.inventarInput.ivid = id;
        this.inventarInput.code = result.inventar.code;
        this.inventarInput.Bezeichnung = result.artikelData.Bezeichnung;
        this.inventarInput.Gruppe = result.artikelData.Gruppe;
        this.inventarInput.Kategorie = result.artikelData.Kategorie;
        this.inventarInput.Typ = result.artikelData.Typ;
        this.inventarInput.Hersteller = result.hersteller.Hersteller;
        this.inventarInput.Groesse = result.artikelData.Groesse;
        this.inventarInput.Farbe = result.artikelData.Farbe;
        this.inventarInput.mcid = result.inventar.mcid;
        this.inventarInput.mcuuid = result.inventar.mcuuid;
        this.inventarInput.gcid = result.artikelRef.gcid;
        this.inventarInput.gcuuid = result.artikelRef.gcuuid;
        this.inventarInput.hid = result.artikelData.hid;
        this.inventarInput.huuid = result.artikelData.huuid;
        this.inventarInput.Zustand = result.inventar.Zustand;
      }
    });
  }

  async formValidate(): Promise<boolean> {
    return true;
  }

  getWhereInputsOf(artikelProperties: string[]): any {
    const daten = { ...this.inventarInput };
    console.log('#201 getWhereInputsOf', { artikelProperties, daten, inventarInput: this.inventarInput });
    const where = artikelProperties
      .filter( p => {
        const hasInput = (p in daten)
          && daten[p] !== 0
          && daten[p] !== ''
          && !!daten[p];
        console.log('#206 getWhereInputsOf', {
          p, hasInput, daten, artikelDaten: { ...this.inventarInput},
          value: this.inventarInput[p], dvalue: daten[p]
        });
        return hasInput;
      })
      .reduce( (o, p) => { o[p] = this.inventarInput[p]; return o; }, {} as any);
    console.log('#210 getWhereInputsOf', { artikelProperties, where, artikelDaten: this.inventarInput });
    return where;
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
    const where = this.getWhereInputsOf(['hid']);
    this.artikelService.getGroupedArtikelTypen(where).then( list => {
      artikelTypen.length = 0;
      list.forEach( (it) => artikelTypen.push( it ) );
    });
  }

  async rebuildTypeaheadFarben() {
    const where = this.getWhereInputsOf(['hid']);
    this.artikelService.getGroupedArtikelFarben(where).then( list => {
      artikelFarben.length = 0;
      list.forEach( (it) => artikelFarben.push( it ) );
    });
  }

  async checkHersteller(): Promise<boolean> {
    console.log('called checkHersteller');
    const input = this.inventarInput.Hersteller;
    const term = (typeof input === 'string') ? input.trim() : '';

    if (term !== this.herstellerExistsStatus.term) {
      this.herstellerExistsStatus.term = term;
      this.herstellerExistsStatus.data = null;
      this.herstellerExistsStatus.hid = null;
      this.herstellerExistsStatus.uuid = null;
    }

    if (term.length) {
      this.herstellerExistsStatus.isQuerying = true;
      return await this.herstellerService.getByName( term ).then( (data) => {
        this.herstellerExistsStatus.data = data;
        this.herstellerExistsStatus.isQuerying = false;
        if (data !== null && data !== undefined) {
          this.herstellerExistsStatus.hid = data.hid;
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
    const d = this.inventarInput;
    const oCheckData: ArtikelPropertiesForQueryCount = {};

    await this.checkHersteller();
    const hid = this.herstellerExistsStatus.hid;

    for (const k of ['Bezeichnung', 'Typ', 'Kategorie', 'Gruppe', 'Groesse', 'Farbe']) {
      if (d[k]) {
        oCheckData[k] = d[k];
      }
    }

    this.listExistingArticleMatches = await this.artikelService.listArticleByProperties(mid, hid, oCheckData);
    this.page = 1;
    this.onPageChange(this.page);
    console.log('finished listArticleMatches with results.count: ', this.listExistingArticleMatches.length,
      ' for', { mid, hid, oCheckData } );
  }

  async checkIfArtikelExistsMandant(): Promise<boolean> {
    console.log('check if bezeichnung exists');
    this.numBezeichnungExists = -1;

    let globalArtikelIds: number[] = [];

    await this.artikelService
      .artikelGlobalByBezeichnung( this.inventarInput.Bezeichnung )
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
    console.log('save inventar');
    if (await this.formValidate()) {
      const ivid = this.id;
      const result = await this.inventarService.updateById(ivid, this.inventarInput);
      if (result.success) {
        this.inventarChanged.emit(result);

        this.inventarInput.hid = result.hersteller.hid;
        this.inventarInput.huuid = result.hersteller.uuid;
        this.inventarInput.mcid = result.artikelRef.mcid;
        this.inventarInput.mcuuid = result.artikelRef.uuid;
        this.inventarInput.gcid = result.artikelData.gcid;
        this.inventarInput.gcuuid = result.artikelData.uuid;

      } else {
        this.formError = 'Daten konnten nicht aktualisiert werden!<br>';
        return false;
      }
      return true;
    } else {
      this.formError = 'Bitte die Angaben vervollständigen, Raum darf noch nicht vergeben sein';
      return false;
    }
  }

  async applyItemAsArtikel(item: any) {
    this.applyItemAsInput(item);
    console.log('#361 applyItemAsArtikel', { item });
    if (!item.mcid || !item.mcuuid) {
      let artikelRef = await this.dataService.getArtikelRefByGcuuidMid(item.gcuuid, this.mid);
      if (!artikelRef) {
        artikelRef = await this.artikelService.insertArtikelRef(item);
      }
      item.mcid = artikelRef.mcid;
      item.mcuuid = artikelRef.uuid;
    }

    if (this.inventarDaten.inventar.mcid !== item.mcid) {
      await this.inventarService.updateRefs(this.id, item.mcid, item.mcuuid, {
        Zustand: this.inventarInput.Zustand,
        code: this.inventarInput.code
      });
    }
    const result = await this.inventarService.getInventar(this.id);

    this.inventarChanged.emit(result);
    return;
  }

  applyItemAsInput(item: any) {
    console.log('#367 applyItemAsInput', { item });
    this.inventarInput.Hersteller = item.Hersteller;
    this.inventarInput.hid = item.hid;
    this.inventarInput.Bezeichnung = item.Bezeichnung;
    this.inventarInput.Gruppe = item.Gruppe;
    this.inventarInput.Kategorie = item.Kategorie;
    this.inventarInput.Farbe = item.Farbe;
    this.inventarInput.Groesse = item.Groesse;
    this.inventarInput.Typ = item.Typ;
    return;
  }

  formatter = (state: string) => state;

  search = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? stateNames
        : stateNames.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchGruppen = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickGrp$.pipe(filter(() => !this.instanceGrp.isPopupOpen()));
    const inputFocus$ = this.focusGrp$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelGruppen
        : artikelGruppen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchKategorien = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickKtg$.pipe(filter(() => !this.instanceKtg.isPopupOpen()));
    const inputFocus$ = this.focusKtg$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelKategorien
        : artikelKategorien.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchTypen = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickTyp$.pipe(filter(() => !this.instanceTyp.isPopupOpen()));
    const inputFocus$ = this.focusTyp$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelTypen
        : artikelTypen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchGroessen = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickGrs$.pipe(filter(() => !this.instanceGrs.isPopupOpen()));
    const inputFocus$ = this.focusGrs$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map(term => (term === '' ? artikelGroessen
        : artikelGroessen.filter(item => new RegExp(term, 'mi').test(item))).slice(0, 10))
    );
  }

  searchFarben = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickFa$.pipe(filter(() => !this.instanceFa.isPopupOpen()));
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
    console.log('selected:', selected, 'selected.item: ', selected.item,
      'foundHst:', foundHst);
    this.inventarInput.hid = (foundHst) ? foundHst.hid : null;
    console.log('this.artikelDaten.Hersteller: ', this.inventarInput.Hersteller, { selected });
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

  onSelectTypen(selected) {
    console.log('Typen selected', selected);
    this.inputChanged.emit();
  }

  onSelectFarben(selected) {
    console.log('Farben selected', selected);
    this.inputChanged.emit();
  }

  onSelectGroessen(selected) {
    console.log('Groessen selected', selected);
    this.inputChanged.emit();
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
    console.log( 'onSubmit', this.inventarInput );
    this.save();
  }

}
