import {Component, EventEmitter, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BasedataService} from '../../../basedata.service';
import {RaumService, RaumStatusProgress} from '../../data-services/raum.service';
import {DBDIGebaeude} from '../../../dexie.service';

@Component({
  selector: 'app-gesamt-list-rest',
  templateUrl: './gesamt-list-rest.component.html',
  styleUrls: ['./gesamt-list-rest.component.scss']
})
export class GesamtListRestComponent implements OnInit {
  requestGesamtDone = new EventEmitter<DBDIGebaeude>();
  gebaeudeDaten?: DBDIGebaeude;
  raeumeListDone?: RaumStatusProgress[];

  constructor(
    private activeModal: NgbActiveModal,
    private baseData: BasedataService,
    private raumData: RaumService
  ) { }

  ngOnInit() {
  }

  set gebaeude(gebaeude: DBDIGebaeude) {
    this.gebaeudeDaten = gebaeude;
    this.loadGebaeudeStat();
  }

  loadGebaeudeStat(useJobid?: number) {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    this.raumData.getRaeumeToDoByGebaeudeId(this.gebaeudeDaten.gid, jobid).then( (list: RaumStatusProgress[]) => {
      this.raeumeListDone = list.sort( (a: RaumStatusProgress, b: RaumStatusProgress) => {
        return a.Raum.toLowerCase() < b.Raum.toLowerCase() ? -1 : 1;
      });
    });
  }

  showGesamtDoneForm() {
    console.log('click showGesamtToDoForm');
    this.activeModal.close();
    this.requestGesamtDone.emit( this.gebaeudeDaten );
  }

}
