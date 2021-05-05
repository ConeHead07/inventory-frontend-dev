import {Component, Directive, EventEmitter, OnInit, Output} from '@angular/core';
import {DBDIInventar, DBDIRaeume} from '../../../../shared/interfaces/dexie.interfaces';
import {InventarService} from '../../data-services/inventar.service';
import {InventarData} from '../../../../shared/services/data.service';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BasedataService} from '../../../../shared/services/basedata.service';
import { faSignOutAlt, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';

interface RaumInventarRest {
  mcuuid: string;
  Bezeichnung?: string;
  Typ?: string;
  Menge?: number;
}

@Component({
  selector: 'app-raum-list-rest',
  templateUrl: './raum-list-rest.component.html',
  styleUrls: ['./raum-list-rest.component.scss']
})
export class RaumListRestComponent implements OnInit {

  @Output() requestDoneList = new EventEmitter<DBDIRaeume>();

  faSignOutAlt = faSignOutAlt;
  faExchangeAlt = faExchangeAlt;

  inventarListRest: RaumInventarRest[] = [];
  inventarListGrouped: RaumInventarRest[] = [];
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
    console.log('typeof this.activeModal.dismiss: ', this.activeModal.dismiss );
  }

  set raum(raum: DBDIRaeume) {
    this.raumDaten = raum;
    if (raum === null || raum === undefined || (typeof raum === 'object' && !('uuid' in raum))) {
      // Do Nothing
      return;
    }
    this.loadInventarByRuuid(raum.uuid).then( () => {
      this.setPage(1);
    });
  }

  setPage(pageNr: number, pageSize?: number) {
    this.total = this.inventarListGrouped.length;
    this.pageSize = Math.max(1, Math.min(this.total, pageSize || this.pageSize || this.total));
    this.totalPages = Math.ceil(this.total / this.pageSize);
    this.pageNr = Math.min(this.totalPages, Math.max(1, pageNr));

    this.inventarListRest = this.inventarListGrouped
      .slice( Math.max(0, this.pageNr - 1) * this.pageSize, this.pageSize );
  }

  async loadInventarByRuuid(ruuid: string, useJobid?: number): Promise<boolean> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const groupedList: RaumInventarRest[] = [];
    console.log('#54 getHello:', this.inventarService.getHello());
    return this.inventarService.getInventarListRestByRaumUuid( ruuid, jobid )
      .then( list => {
        this.inventarDetailList = list;
        this.inventarListGrouped = this.inventarDetailList
          .sort(
          (a, b) => a.inventar.mcuuid > b.inventar.mcuuid ? -1
            : (a.inventar.mcuuid < b.inventar.mcuuid ? 1 : 0)
          )
          .reduce<RaumInventarRest[]>( (gList, item) => {
            const l = gList.length;
            const i = l - 1;
            if (!l || gList[i].mcuuid !== item.inventar.mcuuid) {
              gList[l] = {
                mcuuid: item.inventar.mcuuid,
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

  showRaumDoneForm(e) {
    console.log('click showRaumDoneForm');
    this.activeModal.close();
    this.requestDoneList.emit( this.raumDaten );
  }

}
