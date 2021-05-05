import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BasedataService} from '../../../../shared/services/basedata.service';
import {RaumService, RaumStatusProgress} from '../../data-services/raum.service';
import {DBDIGebaeude} from '../../../../shared/interfaces/dexie.interfaces';
import {
  faCheck,
  faSpinner,
  faBatteryEmpty,
  faBatteryQuarter,
  faBatteryHalf,
  faBatteryThreeQuarters,
  faBatteryFull,
  faSignOutAlt,
  faExchangeAlt
} from '@fortawesome/free-solid-svg-icons';

interface RaumStatusProgressWithIconName extends RaumStatusProgress {
  statusIconName: string;
}

@Component({
  selector: 'app-gesamt-list-done',
  templateUrl: './gesamt-list-done.component.html',
  styleUrls: ['./gesamt-list-done.component.scss']
})
export class GesamtListDoneComponent implements OnInit {
  requestGesamtRest = new EventEmitter<DBDIGebaeude>();
  gebaeudeDaten?: DBDIGebaeude;
  raeumeListDone?: RaumStatusProgressWithIconName[];

  // FA-Icons
  faCheck = faCheck;
  faInWork = faSpinner;
  faEmpty = faBatteryEmpty;
  faQuarter = faBatteryQuarter;
  faHalf = faBatteryHalf;
  faThreeQuarter = faBatteryThreeQuarters;
  faFull = faBatteryFull;
  faSignOutAlt = faSignOutAlt;
  faExchangeAlt = faExchangeAlt;

  @Output() raumSelected = new EventEmitter<string>();

  constructor(
    public activeModal: NgbActiveModal,
    private baseData: BasedataService,
    private raumData: RaumService
  ) { }

  ngOnInit() {
  }

  set gebaeude(gebaeude: DBDIGebaeude) {
    this.gebaeudeDaten = gebaeude;
    this.loadGebaeudeStat();
  }

  onSelectRaum(uuid: string) {
    this.raumSelected.emit( uuid );
    this.activeModal.close();
  }

  getStatusIconNameByItem(item: RaumStatusProgress): string {
    if (item.done === 0) {
      return 'empty';
    } else if (item.done >= item.total ) {
      return 'full';
    } else if (item.progress >= 75) {
      return 'three-quarter';
    } else if (item.progress >= 50) {
      return 'half';
    } else {
      return 'quarter';
    }
  }

  loadGebaeudeStat(useJobid?: number) {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    this.raumData.getRaeumeStartedByGebaeudeId(this.gebaeudeDaten.gid, jobid).then( (list: RaumStatusProgress[]) => {
      this.raeumeListDone = list
        .map<RaumStatusProgressWithIconName>( (item) => {
          item.progress = Math.ceil(item.progress < 99 || item.progress >= 100 ? item.progress : 99);
          return {
            ...item,
            ...{ statusIconName: this.getStatusIconNameByItem(item) }
          } as RaumStatusProgressWithIconName;
        })
        .sort( (a: RaumStatusProgress, b: RaumStatusProgress) => {
          if (a.editStatus === b.editStatus && a.progress === b.progress) {
            return a.Raum.toLowerCase() < b.Raum.toLowerCase() ? -1 : 1;
          } else if (a.editStatus !== b.editStatus) {
            return a.editStatus < b.editStatus ? -1 : 1;
          } else {
            return a.progress < b.progress ? -1 : 1;
          }
      });
    });
  }

  showGesamtRestForm() {
    console.log('click showGesamtToDoForm');
    this.activeModal.close();
    this.requestGesamtRest.emit( this.gebaeudeDaten );
  }

}
