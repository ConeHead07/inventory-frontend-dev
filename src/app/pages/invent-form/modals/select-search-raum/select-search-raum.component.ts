import {AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, filter} from 'rxjs/operators';
import { DataService } from '../../../../shared/services/data.service';
import { faPlus, faSearch, faSearchLocation, faSignOutAlt, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';

import { NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import { DBDIRaeume} from '../../../../shared/interfaces/dexie.interfaces';
import { BasedataService} from '../../../../shared/services/basedata.service';

interface Raum extends DBDIRaeume {
  id: number;
  name: string;
}

const raeume: Raum[] = [];
interface State {uuid: string; name: string; }

const states: State[] = [];

interface RaumOption extends DBDIRaeume {
  uuid: string;
  name: string;
}

@Component({
  selector: 'app-select-search-raum',
  templateUrl: './select-search-raum.component.html',
  styleUrls: ['./select-search-raum.component.scss']
})
export class SelectSearchRaumComponent implements OnInit, AfterViewInit {

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
  @ViewChild('searchInput', {static: true}) searchInput: ElementRef;

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

  ngAfterViewInit() {
    this.setSearchFocus();
  }

  setSearchFocus() {
    if (this.searchInput && this.searchInput.nativeElement && this.searchInput.nativeElement.focus) {
      this.searchInput.nativeElement.focus();
    } else {
      console.error('NOT FOUND this.searchInput.nativeElement');
    }
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
      this.loadRaeume().then( () => {
        this.setSearchFocus();
      });
      this.setSearchFocus();
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
          const itm = { uuid: raum.uuid, name: nameParts.join(' :: ') };
          const rOpt: RaumOption = { ...itm, ...raum};
          if (!states.find( st => st.uuid === rOpt.uuid )) {
            states.push(rOpt);
          }
          return rOpt;
        }) as RaumOption[];
        console.log('loadRaeume: ', { states: {...states} });
        return raeume3;
      })
      .catch( err => { console.error( err ); });
  }
}
