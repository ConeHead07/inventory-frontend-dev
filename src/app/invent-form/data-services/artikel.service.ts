import { Injectable } from '@angular/core';
import {DbInsertResult, DbUpdateResult} from './data-interfaces';
import {DBDIArtikel, DBDIObjektKatalogGlobal, DBDIObjektKatalogMandant, DexieService} from '../../dexie.service';
import {AuthService} from '../../auth/auth.service';
import {Guid} from 'guid-typescript';
import {DBInsertRaumResult, DBUpdateRaumResult, RaumBasisDaten} from './raum.service';


export interface ArtikelBasisDaten {
  mid?: number;
  mcid?: number;
  gcid?: number;
  Bezeichnung?: string;
  Typ?: string;
  Hersteller?: string;
  Groesse?: string;
  Farbe?: string;
  hid?: number;
}

export interface DBInsertArtikelResult extends DbInsertResult {
  newItem?: DBDIArtikel;
}

export interface DBUpdateArtikelResult extends DbUpdateResult {
  item?: DBDIArtikel;
}

@Injectable({
  providedIn: 'root'
})
export class ArtikelService {

  constructor(private dexie: DexieService, private authService: AuthService) {}

  public async artikelExistsGlobal(bezeichnung: string): Promise<boolean> {
    const numItems = await this.dexie.objektKatalogGlobal
      .where('Bezeichnung')
      .equalsIgnoreCase( bezeichnung )
      .count();

    return 0 < numItems;
  }

  public async artikelExistsMandant(mid: number, gcid: number): Promise<boolean> {
    const numItems = await this.dexie.objektKatalogMandant
      .where({ mid, gcid })
      .count();

    return 0 < numItems;
  }

  public async artikelGlobalByBezeichnung(bezeichnung: string): Promise<DBDIObjektKatalogGlobal[]> {
    const items = await this.dexie.objektKatalogGlobal
      .where('Bezeichnung')
      .equalsIgnoreCase( bezeichnung )
      .toArray();

    return items;
  }

  public async artikelMcidByGcids(mid: number, gcids: number|number[]): Promise<DBDIObjektKatalogMandant[]> {
    if (typeof gcids === 'number') {
      gcids = [ gcids ];
    }

    const items = await this.dexie.objektKatalogMandant
      .where( 'gcid').anyOf(gcids)
      .filter( itm => itm.mid === mid)
      .toArray();

    return items;
  }

  public async insert(daten: ArtikelBasisDaten): Promise<DBInsertArtikelResult> {
    const insertData: DBDIArtikel = {
      mid: daten.mid,
      gcid: 0,
      mcid: 0,
      uuid: Guid.create().toString(),
      hash: '',
      code: '',
      Bezeichnung: daten.Bezeichnung,
      Typ: daten.Typ,
      Groesse: daten.Groesse,
      Farbe: daten.Farbe,
      hid: daten.hid,
      created_at: new Date(),
      created_uid: this.authService.getUser().id,
      modified_at: null,
      modified_uid: null
    };
    try {
      const globalArtikels = (await this.artikelGlobalByBezeichnung( daten.Bezeichnung )).filter( itm => {
        return itm.Typ === daten.Typ &&
          itm.Groesse === daten.Groesse &&
          itm.Farbe === daten.Farbe &&
          itm.hid === daten.hid;
      });

      if ( globalArtikels.length > 1) {
        return {
          success: false,
          errorMsg: 'Es existieren bereite ' + globalArtikels.length + ' Artikel im global Katalog!'
        } as DBInsertArtikelResult;
      }

      if ( globalArtikels.length === 1) {
         insertData.gcid = globalArtikels[0].gcid;
      } else {
        insertData.gcid = await this.dexie.objektKatalogGlobal.add(insertData);
      }

      insertData.mcid = await this.dexie.objektKatalogMandant.add(insertData);

      const gItem = await this.dexie.objektKatalogGlobal.get( insertData.gcid );
      const mItem = await this.dexie.objektKatalogMandant.get( insertData.mcid );
      const item = { ...mItem, ...gItem };

      return {
        success: true,
        newId: insertData.mcid,
        data: insertData,
        newItem: item,
      } as DBInsertArtikelResult;
    } catch ( err ) {
      const errorMsg = ( 'name' in err ? err.name + ': ' : '')
        + ( 'message' in err ? err.message : JSON.stringify(err) );
      return {
        success: false,
        errorMsg,
        debug: err,
        data: insertData
      } as DBInsertArtikelResult;
    }

    return {
      success: false,
      errorMsg : 'Artikel konnte nicht angelegt werden. Unbekannter Fehler'
    };
  }

  public async update(artikel: DBDIArtikel): Promise<DBUpdateArtikelResult> {
    return {
      success: false
    };
  }
}
