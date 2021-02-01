import { Injectable } from '@angular/core';
import {DBDIImages } from '../../dexie.interfaces';
import { DexieService } from '../../dexie.service';
import {Guid} from 'guid-typescript';
import {BasedataService} from '../../basedata.service';

export interface ImageBaseData {
  id?: number;
  uuid?: string;
  name?: string;
  size?: number;
  width: number;
  height: number;
  type: string;
  gcuuid: string;
  url?: string;
  data_binary?: any;
  data_url?: string;
  revnr?: number;
  created_at?: Date;
  created_uid?: number;
  created_jobid?: number;
  modified_at?: Date;
  modified_uid?: number;
  modified_jobid?: number;
}
@Injectable({
  providedIn: 'root'
})
export class ImagesService {

  constructor(private dexie: DexieService,
              private baseData: BasedataService) { }

  async insertImage(image: ImageBaseData, useJobid?: number): Promise<string> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const item = {
      uuid: Guid.create().toString(),
      name: image.name,
      size: image.size,
      width: image.width,
      height: image.height,
      type: image.type,
      gcuuid: image.gcuuid,
      url: image.url || '',
      data_binary: image.data_binary || null,
      data_url: image.data_url || null,
      revnr: 1,
      created_at: image.created_at || new Date(),
      created_uid: image.created_uid || uid,
      created_jobid: image.created_jobid || jobid
    };

    const rs = await this.dexie.images.add(item);
    return rs;
  }

  async putImage(image: ImageBaseData, useJobid?: number): Promise<string> {

    await this.dexie.images.where({ gcuuid: image.gcuuid }).delete();

    return this.insertImage(image, useJobid);
  }

  async getImage(gcuuid: string): Promise<DBDIImages> {
    return this.dexie.images.where({ gcuuid }).first();
  }

  async imageExistsOfGcuuid(gcuuid: string): Promise<boolean> {
    return this.dexie.images.where({ gcuuid}).count()
      .then( nr => nr > 0)
      .catch( err => { console.error(err); return false; });
  }
}
