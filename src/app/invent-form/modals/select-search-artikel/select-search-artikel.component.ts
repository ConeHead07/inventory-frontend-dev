import {Component, ElementRef, EventEmitter, OnInit, AfterViewInit, Output, ViewChild} from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, filter} from 'rxjs/operators';
import { DataService } from '../../../inventory/service/data.service';
import { faPlus, faSearch, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import { NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { DBDIArtikel } from '../../../dexie.interfaces';

interface Artikel extends DBDIArtikel {
  id: number;
  name: string;
}

interface State {uuid: string; name: string; }

const states: State[] = [];

export interface ArtikelOption {
  uuid: string;
  mcuuid: string;
  name: string;
}

@Component({
  selector: 'app-select-search-artikel',
  templateUrl: './select-search-artikel.component.html',
  styleUrls: ['./select-search-artikel.component.scss']
})
export class SelectSearchArtikelComponent implements OnInit, AfterViewInit {

  faPlus = faPlus;
  faSignOutAlt = faSignOutAlt;
  faSearch = faSearch;

  public model: Artikel;
  private mid: number;
  private options: ArtikelOption[];

  @Output() artikelSelected = new EventEmitter<ArtikelOption>();
  @Output() artikelCreating = new EventEmitter<number>();
  @ViewChild('searchArtikelInput', {static: false}) searchArtikelInput: ElementRef;

  formatter = (state: Artikel) => state.name;

  search = (text$: Observable<string>) => text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    filter(term => {
      console.log( 'filter by term', term);
      return term.length >= 2;
    }),
    map(term => {
      console.log('map and slice artikels by term', term, 'states', states);
      return states
        .filter(item => new RegExp(term, 'mi').test(item.name))
        .slice(0, 10);
    })
  )

  constructor(private dataService: DataService, public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.setSearchFocus();
  }

  setSearchFocus() {
    if (this.searchArtikelInput && this.searchArtikelInput.nativeElement && this.searchArtikelInput.nativeElement.focus) {
      this.searchArtikelInput.nativeElement.focus();
    } else {
      console.error('NOT FOUND this.searchArtikelInput.nativeElement');
    }
  }

  showCreateForm(event) {
    console.log('showCreateForm');
    this.artikelCreating.emit( this.mid );
    this.activeModal.close();
  }

  onSelectItem(selected) {
    console.log(selected, selected.item);

    this.artikelSelected.emit( selected.item );
    this.activeModal.close();
  }

  get clientId() {
    return this.mid;
  }

  set clientId(mid: number) {
    console.log( 'SET gebaeudeId', 'param', mid, 'old-mid', this.mid);
    if (this.mid !== mid) {
      this.mid = mid;
      console.log( 'Reload Search-List' );
      this.loadArtikels().then( () => {
        this.setSearchFocus();
      });
    }
  }

  async loadArtikels() {
    console.log('called loadArtikels');
    states.length = 1;
    await this.dataService.getArtikelListByClientId( this.mid )
      .then( items => {
          console.log('process fetched artikels', items.length );
          return items.map( artikel => {
            const nameParts = [];
            if (artikel.Typ) {
              nameParts.push(artikel.Typ);
            }
            if (artikel.Bezeichnung) {
              nameParts.push(artikel.Bezeichnung);
            }
            if (artikel.Kategorie) {
              nameParts.push(artikel.Kategorie);
            }
            if (artikel.Gruppe) {
              nameParts.push(artikel.Gruppe);
            }
            if (artikel.Farbe) {
              nameParts.push(artikel.Farbe);
            }
            if (artikel.Groesse) {
              nameParts.push(artikel.Groesse);
            }
            if (artikel.Hersteller) {
              nameParts.push(artikel.Hersteller);
            }

            const option: ArtikelOption = {
              uuid: artikel.mcuuid,
              mcuuid: artikel.mcuuid,
              name: nameParts.join(' :: ')
            };

            states.push( option );
            return { ...artikel, ...option };
        });
      }).then()
      .catch( err => { console.error( err ); });

    if (1) {
      this.search = (text$: Observable<string>) => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(term => term.length >= 2),
        map(term => states
          .filter(item => new RegExp(term, 'mi').test(item.name))
          .slice(0, 10))
      );
    }
  }
}

