import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {DBDIRaeume} from '../../../dexie.interfaces';
import {InventarService} from '../../data-services/inventar.service';
import {InventarData} from '../../../inventory/service/data.service';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BasedataService} from '../../../basedata.service';

interface RaumInventarDone {
  mcid?: number;
  Bezeichnung?: string;
  Typ?: string;
  Menge?: number;
}

@Component({
  selector: 'app-raum-list-done',
  templateUrl: './raum-list-done.component.html',
  styleUrls: ['./raum-list-done.component.scss']
})
export class RaumListDoneComponent implements OnInit {

  @Output() requestRestList = new EventEmitter<DBDIRaeume>();
  inventarListDone: RaumInventarDone[] = [];
  inventarListGrouped: RaumInventarDone[] = [];
  inventarDetailList: InventarData[] = [];
  raumDaten?: DBDIRaeume;

  total = 0;
  pageNr = 1;
  pageSize = 0;
  totalPages = 0;

  constructor(
    public activeModal: NgbActiveModal,
    private inventarService: InventarService,
    private baseData: BasedataService) { }

  ngOnInit() {
  }

  set raum(raum: DBDIRaeume) {
    this.raumDaten = raum;
    this.loadInventarByRid(raum.rid).then( () => {
      this.setPage(1);
    });
  }

  setPage(pageNr: number, pageSize?: number) {
    this.total = this.inventarListGrouped.length;
    this.pageSize = Math.max(1, Math.min(this.total, pageSize || this.pageSize || this.total));
    this.totalPages = Math.ceil(this.total / this.pageSize);
    this.pageNr = Math.min(this.totalPages, Math.max(1, pageNr));

    this.inventarListDone = this.inventarListGrouped
      .slice( Math.max(0, this.pageNr - 1) * this.pageSize, this.pageSize );
  }

  async loadInventarByRid(rid: number, useJobid?: number): Promise<boolean> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const groupedList: RaumInventarDone[] = [];
    console.log('#54 getHello:', this.inventarService.getHello());
    return this.inventarService.getInventarListDoneByRaumId( rid, jobid )
      .then( list => {
        this.inventarDetailList = list;
        this.inventarListGrouped = this.inventarDetailList
          .sort(
            (a, b) => a.inventar.mcid > b.inventar.mcid ? -1
              : (a.inventar.mcid < b.inventar.mcid ? 1 : 0)
          )
          .reduce<RaumInventarDone[]>( (gList, item) => {
            const l = gList.length;
            const i = l - 1;
            if (!l || gList[i].mcid !== item.inventar.mcid) {
              gList[l] = {
                mcid: item.inventar.mcid,
                Bezeichnung: item.inventar.Bezeichnung || item.artikelData.Bezeichnung,
                Typ: item.inventar.Typ || item.artikelData.Typ,
                Menge: 1
              };
            } else {
              gList[i].Menge++;
            }
            return gList;
          }, groupedList);
        return true;
      });
  }

  showRaumRestForm(e) {
    console.log('click showRaumDoneForm');
    this.activeModal.close();
    this.requestRestList.emit( this.raumDaten );
  }

}
