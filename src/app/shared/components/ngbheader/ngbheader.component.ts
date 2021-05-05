import {Component, Input} from '@angular/core';
import { faCog, faHome, faPlayCircle, faPowerOff, faSync, faUser } from '@fortawesome/free-solid-svg-icons';
import {BasedataService} from '../../services/basedata.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-ngbheader',
  templateUrl: './ngbheader.component.html',
  styleUrls: ['./ngbheader.component.scss']
})
export class NgbheaderComponent {
  collapsed = true;
  faCog = faCog;
  faHome = faHome;
  faPlayCircle = faPlayCircle;
  faPowerOff = faPowerOff;
  faSync = faSync;
  faUser = faUser;

  @Input() isLoginPage = false;

  constructor(private baseData: BasedataService, private router: Router) {
  }

  continueLastInventory(): Promise<boolean> {
    //  routerLink="/form-inventory"
    // { path: 'form-inventory/:clientid/:buildingid/:roomid', component: InventFormComponent },
    const jobid = this.baseData.getCurrentJobid();
    const mid = this.baseData.getCurrentMid();
    const gid = this.baseData.getCurrentGid();
    const room = this.baseData.getCurrentRaum();
    console.log('NgbheaderComponent #25 continuelastInventory', {jobid, mid, gid, room });

    if (jobid && mid && gid && room && room.gid === gid) {
      console.log('NgbheaderComponent #28 continuelastInventory goto form-inventory with room');
      return this.router.navigate([
        '/form-inventory', mid, gid, room.uuid
      ]);
    }

    if (jobid && mid && gid) {
      console.log('NgbheaderComponent #35 continuelastInventory goto form-inventory without room');
      return this.router.navigate([
        '/form-inventory', mid, gid
      ]);
    }

    console.log('NgbheaderComponent #28 continuelastInventory goto select-inventory');
    return this.router.navigate(['/select-inventory']);
  }
}
