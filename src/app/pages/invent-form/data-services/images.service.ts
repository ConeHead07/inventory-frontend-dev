import { Injectable } from '@angular/core';
import {DBDIImages, DBDIObjektKatalogImages } from '../../../shared/interfaces/dexie.interfaces';
import { DexieService } from '../../../shared/services/dexie.service';
import {Guid} from 'guid-typescript';
import {BasedataService} from '../../../shared/services/basedata.service';

export interface ImageBaseData {
  id?: number;
  uuid?: string;
  name?: string;
  desc?: string;
  size?: number;
  width: number;
  height: number;
  type: string;
  for_jobid?: number;
  mcuuid: string;
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

export interface ImageRefData {
  id?: number;
  uuid?: string;
  for_jobid: number;
  RefTable: string;
  RefUuid: string;
  ImgUuid: string;
  RefText?: string;
  Pos?: number;
  Kategorie?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImagesService {

  constructor(private dexie: DexieService,
              private baseData: BasedataService) { }

  async insertArtikelImage(image: ImageBaseData, useJobid?: number): Promise<string> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();
    const item: DBDIImages = {
      uuid: Guid.create().toString(),
      name: image.name,
      desc: image.desc,
      size: image.size,
      width: image.width,
      height: image.height,
      type: image.type,
      for_jobid: image.for_jobid,
      mcuuid: image.mcuuid,
      gcuuid: image.gcuuid,
      url: image.url || '',
      data_binary: image.data_binary || null,
      data_url: image.data_url || null,
      revnr: 1,
      created_at: image.created_at || new Date(),
      created_uid: image.created_uid || uid,
      created_jobid: image.created_jobid || jobid
    };

    const rs = await this.dexie.images.add(item).then( (imgUuid) => {
      this.addImageKatalogRef({
        for_jobid: image.for_jobid,
        RefTable: 'ObjektKatalogMandant',
        RefUuid: image.mcuuid,
        ImgUuid: imgUuid,
        RefText: image.desc || image.name,
        Pos: 1,
        Kategorie: ''
      });
      return imgUuid;
    });
    return rs;
  }

  async addImageKatalogRef(data: ImageRefData): Promise<string> {
    const uid = this.baseData.getCurrentUid();
    const devID = this.baseData.getCurrentDeviceId();
    const jobid = this.baseData.getCurrentJobid();
    const uuid = await this.dexie.objektKatalogImages.add({
      for_jobid: data.for_jobid || jobid,
      RefTable: data.RefTable,
      RefUuid: data.RefUuid,
      ImgUuid: data.ImgUuid,
      RefText: data.RefText,
      Pos: data.Pos,
      Kategorie: data.Kategorie,
      created_at: new Date(),
      created_uid: uid,
      created_jobid: jobid,
      created_device_id: devID
    });
    return uuid;
  }

  async putRaumImage(image: ImageBaseData, ruuid: string, useJobid?: number): Promise<string> {

    return this.insertRaumImage(image, ruuid, useJobid);
  }

  async putArtikelImage(image: ImageBaseData, useJobid?: number): Promise<string> {

    await this.dexie.images.where({ gcuuid: image.gcuuid }).delete();

    return this.insertArtikelImage(image, useJobid);
  }

  async getImageByMcuuid(mcuuid: string): Promise<DBDIImages> {
    console.log('called ImageService.getImageByMcuuid:', mcuuid);
    return this.dexie.images.filter( (img) => 'mcuuid' in img && img.mcuuid === mcuuid).first()
      .then( img => img, err => null);

    // Dexie hat den Index 'mcuuid' in Images nicht übernommen
    return this.dexie.images.where({ mcuuid }).first();
  }

  async getImageByGcuuid(gcuuid: string): Promise<DBDIImages> {
    console.log('called ImageService.getImageByGcuuid:', gcuuid);
    return this.dexie.images.where({ gcuuid }).first();
  }

  async getImageByUuid(uuid: string): Promise<DBDIImages> {
    console.log('called ImageService.getImageByUuid:', uuid);
    return this.dexie.images.where({uuid}).first()
      .then( img => img, err => null);
  }

  async imageExistsOfGcuuid(gcuuid: string): Promise<boolean> {
    return this.dexie.images.where({ gcuuid}).count()
      .then( nr => nr > 0)
      .catch( err => { console.error(err); return false; });
  }

  async insertRaumImage(image: ImageBaseData, ruuid: string, useJobid?: number): Promise<string> {
    const jobid = useJobid || this.baseData.getCurrentJobid();
    const uid = this.baseData.getCurrentUid();

    const numExists = await this.dexie.images.where({for_jobid: image.for_jobid, name: image.name}).count();
    if (numExists) {
      let inc = 1;
      let incExists = 0;
      let incName = '';
      do {
        ++inc;
        incName = image.name + '(' + inc + ')';
        incExists = await this.dexie.images.where({for_jobid: image.for_jobid, name: incName}).count();
      } while (incExists > 0);
      image.name = incName;
    }

    const item: DBDIImages = {
      uuid: Guid.create().toString(),
      name: image.name,
      desc: image.desc,
      size: image.size,
      width: image.width,
      height: image.height,
      type: image.type,
      for_jobid: image.for_jobid,
      mcuuid: '',
      gcuuid: '',
      url: image.url || '',
      data_binary: image.data_binary || null,
      data_url: image.data_url || null,
      revnr: 1,
      created_at: image.created_at || new Date(),
      created_uid: image.created_uid || uid,
      created_jobid: image.created_jobid || jobid
    };

    const rs = await this.dexie.images.add(item).then( (imgUuid) => {
      this.addImageKatalogRef({
        for_jobid: image.for_jobid,
        RefTable: 'Raeume',
        RefUuid: ruuid,
        ImgUuid: imgUuid,
        RefText: image.desc || image.name,
        Pos: 1,
        Kategorie: 'Bild'
      });
      return imgUuid;
    });
    return rs;
  }

  async deleteByUuid(uuid: string): Promise<number> {
    return this.dexie.images.where({uuid}).delete()
      .then( (num) => {
      return this.dexie.objektKatalogImages
        .where({ImgUuid: uuid})
        .delete()
        .then( (numLinks) => num + numLinks)
        .catch( () => {
          console.error('ERROR: Can not delete links in objektKatalogImages for uuid: '  + uuid);
          return num;
        });
    })
      .catch( () => {
        console.error('ERROR: Cannot Delete Image with uuid: ' + uuid);
        return 0;
      });
  }
}
