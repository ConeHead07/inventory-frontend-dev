import { Injectable } from '@angular/core';
import { saveAs, encodeBase64 } from '@progress/kendo-file-saver';
import JSZip from 'jszip';
import {DexieService} from './dexie.service';
import Dexie from 'dexie';
import Collection = Dexie.Collection;

@Injectable({
  providedIn: 'root'
})
export class DbexportService {

  constructor(private dexie: DexieService) { }

  create() {
    const zip = new JSZip();
  }

  public async exportTable(tableName: string): Promise<boolean> {
    const zip = new JSZip();
    const tableFile = tableName + '.json';
    const zipFile = tableName + '.zip';
    let dataBuffer = '';
    const tbl = this.dexie.table(tableName);
    if (tbl) {
      tbl.each( (obj, cursor) => {
        if (!dataBuffer) {
          dataBuffer = '  ' + JSON.stringify(obj);
        } else {
          dataBuffer += ',\n  ' + JSON.stringify(obj);
        }
      }).then( () => {
        zip.file(tableFile,
          '{\n' +
          ' "table": ' + JSON.stringify(tableName) + ',\n' +
          ' "data": [\n' +
          dataBuffer +
          ' ]\n' +
          '}'
        );
        return zip.generateAsync({ type: 'blob' }).then( (content) => {
          // see FileSaver.js
          saveAs(content, zipFile);
          return true;
        });
      }).catch( () => false);
    } else {
      return false;
    }
  }

  createZip(): JSZip {
    const zip = new JSZip();
    return zip;
  }

  exportZip(zip: JSZip, zipFile: string) {
    return zip.generateAsync({ type: 'blob' }).then( (content) => {
      // see FileSaver.js
      saveAs(content, zipFile);
      return true;
    });
  }

  async addCollectionToZip<T, K>( collection: Dexie.Collection<T, K>, collectionName: string, zip: JSZip ):
    Promise<boolean> {

    const tableFile = collectionName + '.json';
    let dataBuffer = '';
    const tbl = collection; // this.dexie.table(collectionName);
    if (collection) {
      await tbl.each( (obj, cursor) => {
        if (!dataBuffer) {
          dataBuffer = '  ' + JSON.stringify(obj);
        } else {
          dataBuffer += ',\n  ' + JSON.stringify(obj);
        }
      }).then( () => {
        zip.file(tableFile,
          '{\n' +
          ' "table": ' + JSON.stringify(collectionName) + ',\n' +
          ' "data": [\n' +
          dataBuffer +
          ' ]\n' +
          '}'
        );
        console.log('Added File ' + tableFile + ' to zipFile!');
        return true;
      }).catch( () => {
        console.error('Cannot add File ' + tableFile + ' to zipFile!');
        return false;
      });
    } else {
      console.error('Cannot add File ' + tableFile + ' to zipFile, invalid collection!');
      return false;
    }
  }

  async addArrayToZip<T>( collection: T[], collectionName: string, zip: JSZip ):
    Promise<boolean> {
    // collection.

    const tableFile = collectionName + '.json';
    let dataBuffer = '';
    const tbl = collection; // this.dexie.table(collectionName);
    if ( Array.isArray(collection) ) {
      tbl.forEach( (obj, cursor) => {
        if (!dataBuffer) {
          dataBuffer = '  ' + JSON.stringify(obj);
        } else {
          dataBuffer += ',\n  ' + JSON.stringify(obj);
        }
      });

      zip.file(tableFile,
        '{\n' +
        ' "table": ' + JSON.stringify(collectionName) + ',\n' +
        ' "data": [\n' +
        dataBuffer +
        ' ]\n' +
        '}'
      );
      return true;
    } else {
      return false;
    }
  }
}
