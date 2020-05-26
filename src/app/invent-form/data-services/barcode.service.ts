import {Injectable} from '@angular/core';
import {
  BarcodeLookupSimpleResult,
  DBDIBarcodeLookup,
  DBDIInventar,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant,
  DBDIRaeume,
  DBDITableWithBarcode,
  DexieService,
  LookupResultTable
} from '../../dexie.service';
import Dexie from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  lastErrors: any[] = [];
  lkup: Dexie.Table<DBDIBarcodeLookup, string>;
  rebuildProcesses: string[] = [];

  constructor(private db: DexieService) {
    this.lkup = this.db.barcodeLookup;
  }

  async simpleLookup(barcode: string): Promise<BarcodeLookupSimpleResult> {
    if (barcode.startsWith('R') || barcode.startsWith('A')) {
      return this.bcAnalyzeLookup(barcode);
    }
    return this.indexLookup(barcode);
    /*
    return Promise.all([
      this.indexLookup(barcode),
      this.bcAnalyzeLookup(barcode)
    ]).then( results => results[0] || results[1]);
     */
  }

  async indexLookup(barcode: string): Promise<BarcodeLookupSimpleResult> {
    const found = await this.lkup.get( barcode );

    const result: BarcodeLookupSimpleResult = {
      barcode,
      foundRef: found,
      success: false,
      lookupResultTable: LookupResultTable.None,
      data: null
    };

    if (found) {
      const searchKey = found.uuid ? { uuid: found.uuid } : found.id;
      const item = await this.db.table( found.table ).get( searchKey );
      if (item) {
        result.success = true;
        result.data = item;

        switch (found.table) {
          case 'inventar':
            result.lookupResultTable = LookupResultTable.Inventar;
            result.inventar = item;
            break;

          case 'raeume':
            result.lookupResultTable = LookupResultTable.Raeume;
            result.raum = item;
            break;

          case 'objektKatalogMandant':
            result.lookupResultTable = LookupResultTable.ObjektKatalogMandant;
            result.artikelRef = item;
            break;

          case 'objektKatalogGlobal':
            result.lookupResultTable = LookupResultTable.ObjektKatalogGlobal;
            result.artikelData = item;
            break;

          default:
            result.lookupResultTable = LookupResultTable.Any;
        }
      }
    }

    return result;
  }

  async bcAnalyzeLookup(barcode: string): Promise<BarcodeLookupSimpleResult> {

    const matchesObjektbuchArtikel = barcode.match(/^(A)-(\d+)-/);
    const matchesObjektbuchRaum = barcode.match(/^(R)-(\d+)-/);

    let foundTable: string;
    let foundTableKey: string;
    let foundTableId: number;

    const result: BarcodeLookupSimpleResult = {
      barcode,
      foundRef: null,
      success: false,
      lookupResultTable: LookupResultTable.None,
      data: null
    };

    if ( matchesObjektbuchArtikel ) {
      const [, , sMcid ] = matchesObjektbuchArtikel;
      foundTable = 'objektKatalogMandant';
      foundTableKey = 'mcid';
      foundTableId = parseInt(sMcid, 10);
    } else if ( matchesObjektbuchRaum) {
      const [, , sRid ] = matchesObjektbuchRaum;
      foundTable = 'raeume';
      foundTableKey = 'rid';
      foundTableId = parseInt(sRid, 10);
    }

    if (foundTable && foundTableId) {
      result.data = await this.db.table(foundTable).get(foundTableId);
      if (result.data) {
        result.foundRef = {
          code: barcode,
          table: foundTable,
          key: foundTableKey,
          id: foundTableId,
          uuid: result.data.uuid || null
        };
        switch (foundTable) {
          case 'raeume':
            result.raum = result.data as DBDIRaeume;
            result.lookupResultTable = LookupResultTable.Raeume;
            break;

          case 'objektKatalogMandant':
            result.artikelRef = result.data as DBDIObjektKatalogMandant;
            result.lookupResultTable = LookupResultTable.ObjektKatalogMandant;
            break;
        }
      }
    }

    return result;
  }

  async fullLookup(barcode: string) {
    const simpleResult = await this.simpleLookup(barcode);

    if (!simpleResult.success || simpleResult.lookupResultTable === LookupResultTable.ObjektKatalogGlobal) {
      return simpleResult;
    }

    switch (simpleResult.lookupResultTable) {
      case LookupResultTable.ObjektKatalogMandant:
        simpleResult.artikelData = await this.db.objektKatalogGlobal.get({uuid: simpleResult.artikelRef.gcuuid });
        simpleResult.image = await this.db.images.get({gcuuid: simpleResult.artikelRef.gcuuid });
        if (simpleResult.image) {
          simpleResult.image.data_url = null;
          simpleResult.image.data_binary = null;
        }
        break;

      case LookupResultTable.Raeume:
        simpleResult.gebaeude = await this.db.gebaeude.get( simpleResult.raum.gid );
        break;

      case LookupResultTable.Inventar:
        simpleResult.artikelRef = await this.db.objektKatalogMandant.get( simpleResult.inventar.mcid );
        if (simpleResult.artikelRef) {
          simpleResult.artikelData = await this.db.objektKatalogGlobal.get({ uuid: simpleResult.artikelRef.gcuuid });
          simpleResult.image = await this.db.images.get({gcuuid: simpleResult.artikelRef.gcuuid });
          if (simpleResult.image) {
            simpleResult.image.data_url = null;
            simpleResult.image.data_binary = null;
          }
        }
        simpleResult.raum = await this.db.raeume.get( simpleResult.inventar.rid );
        break;

      default:
        // Nothing, Should not happen

    }
    return simpleResult;
  }

  async rebuild() {
    return Promise.all([
      this.importObjektbuchBarcodesLookup(),
      this.rebuildTable<DBDIInventar>(this.db.inventar),
      this.rebuildTable<DBDIRaeume>(this.db.raeume),
      this.rebuildTable<DBDIObjektKatalogGlobal>(this.db.objektKatalogGlobal),
      this.rebuildTable<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant)
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( 'Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    });
  }

  async rebuildTable<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>): Promise<boolean> {
    if (this.rebuildProcesses.indexOf(table.name) !== -1) {
      return false;
    }
    this.rebuildProcesses.push( table.name );
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    await this.db.barcodeLookup.where( 'table').equals(tblName).delete();
    const list = await table.toArray();
    return Promise.all(
      list.map( (item: any) => {
        return this.addBarcode({
          code: item.code,
          table: tblName,
          key: keyName,
          uuid: item.uuid,
          updateHelper: 1
        });
      }))
      .then( () => true)
      .catch( (err) => {
        console.error( err );
        this.addError( err );
        return false;
      })
      .finally( () => {
        // Clear Finished Process from ProcessList
        this.rebuildProcesses = this.rebuildProcesses.filter( procName => procName !== tblName);
      });
  }

  async importObjektbuchBarcodesLookup(): Promise<boolean> {
    console.log('called importObjektbuchBarcodesLookup');
    this.lkup.where({updateHelper: 11}).modify({updateHelper: 12});
    const list = await this.db.objektbuchBarcodesLookup.toArray();
    await list.forEach( item => {
      item.updateHelper = 11;
      console.log('called importObjektbuchBarcodesLookup import ', { item });
      this.lkup.put(item ).then( (r) => {
        // console.log('#229 result of put', item, r);
      }).catch( (err) => {
        console.error( '#231', err );
      });
    });
    await this.lkup.where({updateHelper: 12}).delete();
    return true;
  }

  async rebuildOnRunningSystem() {
    return Promise.all([
      this.importObjektbuchBarcodesLookup(),
      this.rebuildTableOnRunningSystem<DBDIInventar>(this.db.inventar),
      this.rebuildTableOnRunningSystem<DBDIRaeume>(this.db.raeume),
      this.rebuildTableOnRunningSystem<DBDIObjektKatalogGlobal>(this.db.objektKatalogGlobal),
      this.rebuildTableOnRunningSystem<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant)
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( 'Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    }).catch( (err) => {
      console.error('Fehler beim Barcode-Lookup-Aufbar: ', { err });
    });
  }

  async rebuildTableOnRunningSystem<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>) {
    if (this.rebuildProcesses.indexOf(table.name) !== -1) {
      return false;
    }
    this.rebuildProcesses.push( table.name );
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    await this.db.barcodeLookup.where( {table: tblName, updateHelper: 1}).modify({updateHelper: 2});
    const list = await table.toArray();
    await Promise.all(
      list.map( (item: any) => {
        return this.addBarcode({
          code: item.code,
          table: tblName,
          key: keyName,
          uuid: item.uuid,
          updateHelper: 1
        });
      })
    );
    await this.db.barcodeLookup.where( {table: tblName, updateHelper: 2}).delete();
    // Clear Finished Process from ProcessList
    this.rebuildProcesses = this.rebuildProcesses.filter( procName => procName !== tblName);
  }

  async addBarcode(item: DBDIBarcodeLookup): Promise<string> {
    return this.db.barcodeLookup.put(item);
  }

  addError( err: any) {
    this.lastErrors.push( err );
    if (this.lastErrors.length > 20) {
      this.lastErrors = this.lastErrors.slice(-20);
    }
  }

  getLastErrors(): any[] {
    return this.lastErrors;
  }
}
