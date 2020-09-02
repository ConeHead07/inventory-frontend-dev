import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, filter} from 'rxjs/operators';
import { DataService } from '../../../inventory/service/data.service';
import { faPlus, faSearch, faSearchLocation, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

import {NgbModal, ModalDismissReasons, NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {DBDIRaeume, DBDIRaumGebaeude} from '../../../dexie.service';
import {ScannerBarcodeData} from '../scanner/scanner.component';
import {BasedataService} from "../../../basedata.service";

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
  private jobid: number;
  private options: RaumOption[];

  @Output() raumSelected = new EventEmitter<DBDIRaeume>();
  @Output() raumCreating = new EventEmitter<number>();

  formatter = (state: Raum) => state.name;

  search = (text$: Observable<string>) => text$.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    filter(term => {
      return term.length >= 1;
    }),
    map(term => {
      // console.log('map and slice artikel by term', term, 'states', states);
      const matches = states
        .filter(item => new RegExp(term, 'mi').test(item.name) )
        .sort()
        .slice(0, 10);
      console.log('search ', { term, matches: { ...matches}, states });
      return matches;
    })
  )

  constructor(private dataService: DataService,
              public activeModal: NgbActiveModal,
              private baseData: BasedataService) { }

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
      this.jobid = this.baseData.getCurrentJobid();
      console.log( 'Reload Search-List' );
      this.loadRaeume();
    }
  }

  async loadRaeume() {
    console.log('called loadRaeume');
    states.length = 0;
    this.dataService.getRaeumeByGebaeudeId( this.gid, this.jobid )
      .then( raeume2 => {
        console.log('loadRaeume: ', { raeume2: {...raeume2} });
        const raeume3: RaumOption[] = raeume2.map<RaumOption>( raum => {
          const nameParts = [];
          if (raum.Raum) {
            nameParts.push(raum.Raum);
          }
          if (raum.Raumbezeichnung) {
            nameParts.push(raum.Raumbezeichnung);
          }
          if (raum.Etage) {
            nameParts.push(raum.Etage);
          }
          const itm = { id: raum.rid, name: nameParts.join(' :: ') };
          const rOpt: RaumOption = { ...itm, ...raum};
          if (!states.find( st => st.id === rOpt.id )) {
            states.push(rOpt);
          }
          return rOpt;
        }) as RaumOption[];
        console.log('loadRaeume: ', { states: {...states} });
        return raeume3;
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
