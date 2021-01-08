import {Injectable} from '@angular/core';
import { DexieService } from '../../dexie.service';
import {
  BarcodeLookupSimpleResult,
  DBDIBarcodeLookup,
  DBDIInventar,
  DBDIObjektKatalogGlobal,
  DBDIObjektKatalogMandant,
  DBDIRaeume,
  DBDITableWithBarcode,
  LookupResultTable
} from '../../dexie.interfaces';
import Dexie from 'dexie';

interface RebuildProcess {
  jobid: number;
  table: string;
}
@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  lastErrors: any[] = [];
  lkup: Dexie.Table<DBDIBarcodeLookup, [string, number]>;
  rebuildProcesses: RebuildProcess[] = [];

  constructor(private db: DexieService) {
    this.lkup = this.db.barcodeLookup;
  }

  async simpleLookup(barcode: string, jobid: number): Promise<BarcodeLookupSimpleResult> {
    if (barcode.startsWith('R') || barcode.startsWith('A')) {
      return await this.bcAnalyzeLookup(barcode);
    }
    return await this.indexLookup(barcode, jobid);
    /*
    return Promise.all([
      this.indexLookup(barcode),
      this.bcAnalyzeLookup(barcode)
    ]).then( results => results[0] || results[1]);
     */
  }

  async indexLookup(barcode: string, jobid: number): Promise<BarcodeLookupSimpleResult> {
    barcode = this.bcTrimZero(barcode);
    const found = await this.lkup.get( { code: barcode, for_jobid: jobid } );
    console.log('#47 barcode.service.ts indexLookup(', { barcode, jobid}, ')', { found });

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
    const matchesObjektbuchRaum = !matchesObjektbuchArtikel ? barcode.match(/^(R)-(\d+)-/) : false;

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
        result.success = true;
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

  bcTrimZero(barcode: string) {
    barcode = barcode.trim();
    while (barcode.charAt(0) === '0') {
      barcode = barcode.substr(1).trim();
    }
    return barcode;
  }

  async fullLookup(barcode: string, jobid: number) {
    barcode = this.bcTrimZero(barcode);
    const simpleResult = await this.simpleLookup(barcode, jobid);
    const lookupResultTableText = LookupResultTable[simpleResult.lookupResultTable];
    console.log(`#146 fullLookup for ${barcode} found ${lookupResultTableText}`, { simpleResult });

    if (!simpleResult.success || simpleResult.lookupResultTable === LookupResultTable.ObjektKatalogGlobal) {
      console.log(`#150 fullLookup for ${barcode} return ${lookupResultTableText}`);
      return simpleResult;
    }

    switch (simpleResult.lookupResultTable) {
      case LookupResultTable.ObjektKatalogMandant:
        console.log(`#156 fullLookup for ${barcode} fetch global Data for ${lookupResultTableText}`);
        simpleResult.artikelData = await this.db.objektKatalogGlobal.get({uuid: simpleResult.artikelRef.gcuuid });
        simpleResult.image = await this.db.images.get({gcuuid: simpleResult.artikelRef.gcuuid });
        if (simpleResult.image) {
          simpleResult.image.data_url = null;
          simpleResult.image.data_binary = null;
        }
        break;

      case LookupResultTable.Raeume:
        console.log(`#166 fullLookup for ${barcode} fetch gebaeude Data for ${lookupResultTableText}`);
        simpleResult.gebaeude = await this.db.gebaeude.get( simpleResult.raum.gid );
        break;

      case LookupResultTable.Inventar:
        console.log(`#171 fullLookup for ${barcode} fetch artikelRef/global/image/raum Data for ${lookupResultTableText}`);
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
    console.log(`#166 fullLookup for ${barcode} return data for ${lookupResultTableText}`, { simpleResult });
    return simpleResult;
  }

  async rebuild() {
    return Promise.all([
      this.rebuildTable<DBDIInventar>(this.db.inventar),
      this.rebuildTable<DBDIRaeume>(this.db.raeume),
      this.rebuildTable<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant)
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( 'Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    });
  }

  async rebuildTable<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>): Promise<boolean> {
    if (this.rebuildProcesses.find( p => p.table === table.name) ) {
      return false;
    }
    this.rebuildProcesses.push( { jobid: 0, table: table.name });
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    console.log('#212 barcode.service rebuildTable delete barcodeLookup for table ', tblName);
    await this.db.barcodeLookup.where( 'table').equals(tblName).delete();

    return this.db
      .transaction( 'rw', [table, this.db.barcodeLookup], () => {
        table.each( (item) => {
          this.db.barcodeLookup.put({...{
            code: item.code,
            table: tblName,
            for_jobid: item.for_jobid,
            key: keyName,
            uuid: item.uuid,
            updateHelper: 1
          }, ...{log: false}});
        });
      })
      .then( () => true)
      .finally( () => {
        this.rebuildProcesses = this.rebuildProcesses.filter( p => p.table !== tblName);
      });
  }

  async rebuildByJobid(jobid: number) {
    console.log('#235 barcode.service.ts rebuildByJobid', { jobid });
    return Promise.all([
      this.rebuildTableByJobid<DBDIInventar>(this.db.inventar, jobid),
      this.rebuildTableByJobid<DBDIRaeume>(this.db.raeume, jobid),
      this.rebuildTableByJobid<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant, jobid)
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( '#242 Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    });
  }

  async rebuildTableByJobid<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>, jobid: number): Promise<boolean> {
    if (this.rebuildProcesses.find( p => (p.jobid === 0 || p.jobid === jobid) && p.table === table.name) ) {
      console.error('Abort barcode rebuild, it is already running');
      return false;
    }

    this.rebuildProcesses.push( { jobid, table: table.name} );
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    console.log('#253.. barcode.service rebuildTableByJobid delete barcodeLookup for table ', tblName, jobid);
    await this.db.barcodeLookup.where( { table: tblName, for_jobid: jobid }).delete();
    console.log('#255 barcode.service rebuildTableByJobid processing for table ', tblName, jobid);
    let count = 0;
    return this.db
      .transaction( 'rw', [table, this.db.barcodeLookup], () => {
        table.where({ for_jobid: jobid }).each( (item) => {
          count += 1;
          this.db.barcodeLookup.put({...{
            code: item.code,
            table: tblName,
            for_jobid: item.for_jobid,
            key: keyName,
            uuid: item.uuid,
            updateHelper: 1
          }, ...{log: false}});
        });
      })
      .then( () => {
        console.log('#270 barcode.serve rebuildTableByJobid finished successful', { tblName, jobid, count });
        return  true;
      })
      .catch( () => {
        console.log('#274 barcode.serve rebuildTableByJobid finished with Errors', tblName, jobid);
        return false;
      })
      .finally( () => {
        this.rebuildProcesses = this.rebuildProcesses.filter( p => p.jobid !== jobid && p.table !== tblName);
      });
  }

  async importObjektbuchBarcodesLookup(): Promise<boolean> {
    console.log('called importObjektbuchBarcodesLookup');
    this.lkup.where({updateHelper: 11}).modify({updateHelper: 12});
    const list = await this.db.objektbuchBarcodesLookup.toArray();
    await list.forEach( item => {
      item.updateHelper = 11;
      console.log('called importObjektbuchBarcodesLookup import ', { item });
      this.lkup.put({...item, ...{log: false}} ).then( (r) => {
        // console.log('#229 result of put', item, r);
      }).catch( (err) => {
        console.error( '#231', err );
      });
    });
    await this.lkup.where({updateHelper: 12}).delete();
    return true;
  }

  async rebuildOnRunningSystemByJobid(jobid: number) {
    return Promise.all([
      this.rebuildTableOnRunningSystemByJobid<DBDIInventar>(this.db.inventar, jobid)
        .finally(() => console.log('#261 barcode.service Finished BC-Rebuild Inventar')),
      this.rebuildTableOnRunningSystemByJobid<DBDIRaeume>(this.db.raeume, jobid)
        .finally(() => console.log('#263 barcode.service Finished BC-Rebuild Raeume!')),
      this.rebuildTableOnRunningSystemByJobid<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant, jobid)
        .finally(() => console.log('#267 barcode.service Finished BC-Rebuild objektKatalogMandant!'))
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( 'Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    }).catch( (err) => {
      console.error('Fehler beim Barcode-Lookup-Aufbau: ', { err });
    });
  }

  async rebuildTableOnRunningSystemByJobid<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>, jobid: number) {
    if (this.rebuildProcesses.find( p => (p.jobid === 0 || p.jobid === jobid) && p.table === table.name) ) {
      return false;
    }
    this.rebuildProcesses.push( { jobid, table: table.name } );
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    const tblBarcodeLookup = this.db.barcodeLookup;
    let count = 0;

    await this.db.transaction('rw', [tblBarcodeLookup, table], () => {
      tblBarcodeLookup
        .where( { table: tblName, for_jobid: jobid, updateHelper: 1 })
        .modify({ updateHelper: 2 })
        .then( () => {
          table.where({for_jobid: jobid })
            .filter( (item) => !!item.code)
            .each ( (item) => {
              const forJobid = ('for_jobid' in item) ? item.for_jobid : 0;
              count += 1;
              tblBarcodeLookup.put({...{
                code: item.code,
                table: tblName,
                key: keyName,
                for_jobid: forJobid,
                uuid: item.uuid,
                updateHelper: 1
            }, ...{log: false}});
          });
        });
    } );

    const numDeletes = await tblBarcodeLookup.where( {table: tblName, for_jobid: jobid, updateHelper: 2}).delete();

    console.log('#356 barcode.service.ts rebuildTableOnRunningSystemByJobid finished', {
      jobid, table: table.name, count, numDeletes
    });
    // Clear Finished Process from ProcessList
    this.rebuildProcesses = this.rebuildProcesses.filter( p => p.jobid !== jobid && p.table !== tblName);
  }

  async rebuildOnRunningSystem() {
    return Promise.all([
      this.rebuildTableOnRunningSystem<DBDIInventar>(this.db.inventar)
        .finally(() => console.log('#261 barcode.service Finished BC-Rebuild Inventar')),
      this.rebuildTableOnRunningSystem<DBDIRaeume>(this.db.raeume)
        .finally(() => console.log('#263 barcode.service Finished BC-Rebuild Raeume!')),
      this.rebuildTableOnRunningSystem<DBDIObjektKatalogMandant>(this.db.objektKatalogMandant)
        .finally(() => console.log('#267 barcode.service Finished BC-Rebuild objektKatalogMandant!'))
    ]).then( (results) => {
      const numErrors = results.filter( re => !re).length;
      this.addError( 'Beim Rebuild des Lookup-Indexes sind ' + numErrors + ' aufgetreten!');
      return numErrors === 0;
    }).catch( (err) => {
      console.error('Fehler beim Barcode-Lookup-Aufbau: ', { err });
    });
  }

  async rebuildTableOnRunningSystem<I extends DBDITableWithBarcode>(table: Dexie.Table<I, number>): Promise<boolean> {
    if (this.rebuildProcesses.find( p => p.table === table.name)) {
      return false;
    }
    this.rebuildProcesses.push( { jobid: 0, table: table.name } );
    const keyName: string = table.schema.primKey.keyPath.toString();
    const tblName = table.name;
    const tblBarcodeLookup = this.db.barcodeLookup;

    console.log('rebuildTableOnRunningSystem Start Transaction Barcode-Indexing for table ' + table.name);
    await this.db.transaction('rw', [tblBarcodeLookup, table], () => {
      console.log('rebuildTableOnRunningSystem Set Flag updateHelper=2 for table ' + table.name);
      tblBarcodeLookup
        .where( {table: tblName, updateHelper: 1})
        .modify({updateHelper: 2})
        .then( () => {
          console.log('rebuildTableOnRunningSystem rebuild Barcode for table ' + table.name);
          table.filter( (item) => !!item.code).each ( (item) => {
            const forJobid = ('for_jobid' in item) ? item.for_jobid : 0;
            tblBarcodeLookup.put({...{
              code: item.code,
              table: tblName,
              key: keyName,
              for_jobid: forJobid,
              uuid: item.uuid,
              updateHelper: 1
            }, ...{log: false}});
          });
        });
    } );

    console.log('rebuildTableOnRunningSystem delete Barcodes for no more existing entries in ' + table.name);
    await tblBarcodeLookup.where( {table: tblName, updateHelper: 2}).delete();
    // Clear Finished Process from ProcessList
    this.rebuildProcesses = this.rebuildProcesses.filter( p => p.table !== tblName);
    return true;
  }

  async addBarcode(item: DBDIBarcodeLookup, log: boolean = false): Promise<string> {
    return this.db.barcodeLookup.put({...item, ...{log}}).then( (key) => key[0]);
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
