import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, filter} from 'rxjs/operators';
import { DataService } from '../../../inventory/service/data.service';
import { faPlus, faSearch, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import { NgbModal, ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { DBDIArtikel } from '../../../dexie.service';
import { ScannerBarcodeData } from '../scanner/scanner.component';

interface Artikel extends DBDIArtikel {
  id: number;
  name: string;
}

interface State {id: number; name: string; }

const states: State[] = [];

export interface ArtikelOption {
  id: number;
  mcid: number;
  mcuuid: string;
  name: string;
}

@Component({
  selector: 'app-select-search-artikel',
  templateUrl: './select-search-artikel.component.html',
  styleUrls: ['./select-search-artikel.component.scss']
})
export class SelectSearchArtikelComponent implements OnInit {

  faPlus = faPlus;
  faSignOutAlt = faSignOutAlt;
  faSearch = faSearch;

  public model: Artikel;
  private mid: number;
  private options: ArtikelOption[];

  @Output() artikelSelected = new EventEmitter<ArtikelOption>();
  @Output() artikelCreating = new EventEmitter<number>();

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
      this.loadArtikels();
    }
  }

  async loadArtikels() {
    console.log('called loadArtikels');
    await this.dataService.getArtikelListByClientId( this.mid )
      .then( items => {
          console.log('process fetched artikels', items.length );
          return items.map( artikel => {
            const option: ArtikelOption = {
              id: artikel.mcid,
              mcid: artikel.mcid,
              mcuuid: artikel.mcuuid,
              name: artikel.Bezeichnung
            };
            console.log('loadArtikels push ', { artikel, option });
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

