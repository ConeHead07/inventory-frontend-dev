import { Injectable } from '@angular/core';
import {DBDIRaeume, DexieService} from '../../dexie.service';
import { Guid } from 'guid-typescript';
import { Md5 } from 'ts-md5';
import { AuthService } from '../../auth/auth.service';
import { DbInsertResult, DbUpdateResult, DbTransactionResult } from './data-interfaces';

export interface RaumBasisDaten {
  gid?: number;
  Raum?: string;
  Raumbezeichnung?: string;
  Etage?: string;
}

export interface DBInsertRaumResult extends DbInsertResult {
  newItem?: DBDIRaeume;
}

export interface DBUpdateRaumResult extends DbUpdateResult {
  item?: DBDIRaeume;
}


@Injectable({
  providedIn: 'root'
})
export class RaumService {

  constructor(private dexie: DexieService, private authService: AuthService) {}

  public async raumExists(gid: number, raum: string): Promise<boolean> {
    const numRaeume = await this.dexie.raeume
      .where('Raum')
      .equalsIgnoreCase( raum )
      .filter( itm => itm.gid === gid)
      .count();

    return 0 < numRaeume;
  }

  public async raumBezeichnungExists(gid: number, bezeichnung: string): Promise<boolean> {
    const numRaeume = await this.dexie.raeume
      .where('Raumbezeichnung')
      .equalsIgnoreCase( bezeichnung )
      .filter( itm => itm.gid === gid)
      .count();

    return 0 < numRaeume;
  }

  public async insert(daten: RaumBasisDaten): Promise<DBInsertRaumResult> {
    const insertData: DBDIRaeume = {
      gid: daten.gid,
      uuid: Guid.create().toString(),
      hash: '',
      code: '',
      raumid: '',
      Raum: daten.Raum,
      Raumbezeichnung: daten.Raumbezeichnung,
      Etage: daten.Etage,
      created_at: new Date(),
      created_uid: this.authService.getUser().id,
      modified_at: null,
      modified_uid: null
    };

    let newId = 0;
    let newItem = null;
    try {
      newId = await this.dexie.raeume.add(insertData);
      newItem = await this.dexie.raeume.get(newId);
    } catch ( err ) {
      const errorMsg = ( 'name' in err ? err.name + ': ' : '')
        + ( 'message' in err ? err.message : JSON.stringify(err) );
      return {
        success: false,
        errorMsg,
        debug: err,
        data: insertData
      } as DBInsertRaumResult;
    }

    console.log('insert Raum ', { newItem });
    return {
      success: true,
      newId,
      newItem
    };
  }

  public async update(raum: DBDIRaeume): Promise<DBUpdateRaumResult> {
    return {
      success: false
    };
  }
}
