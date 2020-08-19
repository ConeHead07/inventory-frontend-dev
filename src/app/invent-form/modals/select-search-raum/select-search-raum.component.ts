import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, filter} from 'rxjs/operators';
import { DataService } from '../../../inventory/service/data.service';
import { faPlus, faSearch, faSearchLocation, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import {NgbModal, ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {DBDIRaeume, DBDIRaumGebaeude} from '../../../dexie.service';
import {ScannerBarcodeData} from '../scanner/scanner.component';

interface Raum extends DBDIRaeume {
  id: number;
  name: string;
}

let raeume: Raum[];
interface State {id: number; name: string; }

const states: State[] = [];

interface RaumOption extends DBDIRaeume {
  id: number;
  name: string;
}

@Component({
  selector: 'app-select-search-raum',
  templateUrl: './select-search-raum.component.html',
  styleUrls: ['./select-search-raum.component.scss']
})
export class SelectSearchRaumComponent implements OnInit {

  faPlus = faPlus;
  faSearch = faSearch;
  faSearchLocation = faSearchLocation;
  faSignOutAlt = faSignOutAlt;

  public model: Raum;
  private gid: number;
  private options: RaumOption[];

  @Output() raumSelected = new EventEmitter<DBDIRaeume>();
  @Output() raumCreating = new EventEmitter<number>();

  formatter = (state: Raum) => state.name;

  search = (text$: Observable<string>) => text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    filter(term => {
      console.log( 'filter by term', term);
      return term.length >= 2;
    }),
    map(term => {
      console.log('map and slice artikel by term', term, 'states', states);
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
    this.raumCreating.emit( this.gid );
    this.activeModal.close();
  }

  onSelectItem(selected) {
    console.log(selected, selected.item);

    this.raumSelected.emit( selected.item );
    this.activeModal.close();
  }

  get gebaeudeId() {
    return this.gid;
  }

  set gebaeudeId(gid: number) {
    console.log( 'SET gebaeudeId', 'param', gid, 'old-gid', this.gid);
    if (this.gid !== gid) {
      this.gid = gid;
      console.log( 'Reload Search-List' );
      this.loadRaeume();
    }
  }

  loadRaeume() {
    console.log('called loadRaeume');

    this.dataService.getRaeumeByGebaeudeId( this.gid )
      .then( raeume2 => {
        console.log('process fetched raeume', raeume2.length );
        const raeume3: RaumOption[] = raeume2.map<RaumOption>( raum => {
          const itm = { id: raum.rid, name: raum.Raum };
          const rOpt: RaumOption = { ...itm, ...raum};
          states.push( rOpt );
          return rOpt;
        }) as RaumOption[];
        return raeume3;
      })
      .then( raeume4 => {
        this.search = (text$: Observable<string>) => text$.pipe(
          debounceTime(200),
          distinctUntilChanged(),
          filter(term => term.length >= 2),
          map(term => raeume4
            .filter(item => new RegExp(term, 'mi').test(item.name))
            .slice(0, 10))
        );
      })
      .catch( err => { console.error( err ); });

    if (0) {
      this.search = (text$: Observable<string>) => text$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(term => term.length >= 2),
        map(term => raeume
          .filter(item => new RegExp(term, 'mi').test(item.name))
          .slice(0, 10))
      );
    }
  }
}
