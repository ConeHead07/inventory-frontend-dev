import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  faArrowAltCircleLeft,
  faArrowAltCircleRight,
  faDotCircle,
  faAngleLeft,
  faAngleRight,
  faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import {DBDIImages} from '../../../../shared/interfaces/dexie.interfaces';
import {DexieService} from '../../../../shared/services/dexie.service';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {ImagesService} from '../../data-services/images.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {VariablesService} from '../../../../shared/services/variables.service';
import {ToastrService} from 'ngx-toastr';

enum HtmlImageLoadingStatus {
  Pending,
  Loading,
  Aborted,
  Loaded,
  NotFound,
  Error
}

interface HtmlImageWithStatus {
  uuid: string;
  name?: string;
  width?: number;
  height?: number;
  type?: string;
  titel?: string;
  desc?: string;
  img?: HTMLImageElement;
  loadingStatus: HtmlImageLoadingStatus;
  isDeletable: boolean;
  isEditable: boolean;
  error?: string;
}

@Component({
  selector: 'app-imagebox',
  templateUrl: './imagebox.component.html',
  styleUrls: ['./imagebox.component.scss']
})
export class ImageboxComponent implements OnInit {

  @ViewChild('currentImage', { static: true })
  public currentImage: ElementRef;

  faAngleLeft = faAngleLeft;
  faAngleRight = faAngleRight;
  faArrowLeft = faArrowAltCircleLeft;
  faArrowRight = faArrowAltCircleRight;
  faDot = faDotCircle;
  faTrashAlt = faTrashAlt;

  titel = '';
  htmlImageLoadingStatus = HtmlImageLoadingStatus;
  images: HtmlImageWithStatus[] = [];
  imageUuidList: string[] = [];
  numImages = 0;
  numImgFound = 0;
  numImgFinished = 0;
  numImgLoaded = 0;
  currImgIdx = 0;
  finishedLoading = false;
  currImg?: HtmlImageWithStatus = null;
  prevImg?: HtmlImageWithStatus = null;
  nextImg?: HtmlImageWithStatus = null;
  error = '';

  constructor(private dexie: DexieService,
              private imgService: ImagesService,
              public activeModal: NgbActiveModal,
              private domSanitizer: DomSanitizer,
              private toastr: ToastrService) { }

  ngOnInit(): void {
  }

  setTitel(titel: string) {
    this.titel = titel;
  }

  async setImagesUuids(uuids: string[], currIdx: number = 0) {
    console.log('ImageboxComponent.setImagesUuids #65', { uuids, currIdx });
    this.currImg = null;
    this.prevImg = null;
    this.nextImg = null;
    this.imageUuidList = uuids;
    this.numImages = this.imageUuidList.length;
    if (currIdx < 0 ) {
      this.currImgIdx = 0;
    } else if (currIdx > this.numImages - 1) {
      this.currImgIdx = this.numImages - 1;
    } else {
      this.currImgIdx = currIdx;
    }
    this.images.length = 0;
    this.images.length = this.imageUuidList.length;
    this.images.fill(null);

    console.log('ImageboxComponent.setImagesUuids #82 loadImage', { currIdx });
    await this.loadImage(currIdx)
      .catch( reason => {
        console.error('Could not load Image', { reason });
      })
      .then( (success) => {
        console.log('#86 loadImage(', currIdx, ') successful');
      });

    if (this.numImages > 1) {
      console.log('ImageboxComponent.setImagesUuids #82 loadImages');
      await this.loadImages()
        .catch( reason => {
          console.error('#92 Could not load all Images', { reason });
        }).then( (result) => {
          console.log('#94 loaded all Images in List by loadImages() successful', { result });
        });
    }
    this.finishedLoading = true;
  }

  async loadImages(): Promise<number> {
    const dbImages = this.dexie.images;
    const thisImages = this.images;
    const numUuids = this.imageUuidList.length;
    let numResults = 0;
    let numFound = 0;
    let numFinished = 0;
    let numLoaded = 0;
    return new Promise( (resolve, reject) => {
      const checkResolve = () => {
        console.log('ImageboxComponent.setImagesUuids #102 loadImages checkResolve',
          numResults, numUuids, numFinished, numFound, numLoaded);
        if (numResults === numUuids && numFinished === numFound) {
          console.log('ImageboxComponent.setImagesUuids #104 loadImages checkResolve');
          if (numFound === numUuids) {
            console.log('ImageboxComponent.setImagesUuids #106 loadImages checkResolve resolve');
            resolve(numLoaded);
          } else {
            console.log('ImageboxComponent.setImagesUuids #109 loadImages checkResolve reject');
            reject(numLoaded);
          }
        }
      };
      this.imageUuidList.map((uuid, idx) => {
        console.log('ImageboxComponent #124', { uuid, idx }, thisImages[idx]);
        if (thisImages[idx] !== null
          && typeof thisImages[idx] === 'object'
          && 'loadingStatus' in thisImages[idx]
          && thisImages[idx].loadingStatus === HtmlImageLoadingStatus.Loaded) {
          ++numResults;
          ++numLoaded;
          return;
        }
        dbImages.get(uuid)
          .then(row => {
            ++numResults;
            if (!row) {
              thisImages[idx] = {
                uuid,
                img: null,
                loadingStatus: HtmlImageLoadingStatus.NotFound,
                isDeletable: true,
                isEditable: true
              };
              checkResolve();
              return;
            }
            ++numFound;
            console.log('ImageboxComponent #145', idx, thisImages[idx]);
            if (thisImages[idx] !== null
              && typeof thisImages[idx] === 'object'
              && 'loadingStatus' in thisImages[idx]
              && thisImages[idx].loadingStatus === HtmlImageLoadingStatus.Loaded) {
              ++numLoaded;
              checkResolve();
              return;
            }
            ++this.numImgFound;
            thisImages[idx] = {
              uuid,
              name: row.name,
              width: row.width,
              height: row.height,
              type: row.type,
              desc: row.desc,
              loadingStatus: HtmlImageLoadingStatus.Loading,
              isDeletable: true,
              isEditable: true,
              img: new Image()
            };
            thisImages[idx].img.onload = (ev) => {
              ++numFinished;
              ++numLoaded;
              ++this.numImgLoaded;
              ++this.numImgFinished;
              thisImages[idx].loadingStatus = HtmlImageLoadingStatus.Loaded;
              console.log('successfull loaded ' + idx + '=' + thisImages[idx].img.src);
              checkResolve();
            };
            thisImages[idx].img.onerror = (ev) => {
              ++numFinished;
              ++this.numImgFinished;
              thisImages[idx].loadingStatus = HtmlImageLoadingStatus.Error;
              checkResolve();
            };
            thisImages[idx].img.onabort = (ev) => {
              ++numFinished;
              ++this.numImgFinished;
              thisImages[idx].loadingStatus = HtmlImageLoadingStatus.Aborted;
              checkResolve();
            };
            thisImages[idx].img.src = row.data_url.replace(/(\r\n|\n|\r)/gm, '');
          }).catch(reason => {
            ++numResults;
            ++this.numImgFinished;
            thisImages[idx].loadingStatus = HtmlImageLoadingStatus.NotFound;
            checkResolve();
        });
      });
      checkResolve();
    });
  }

  prev() {
    this.loadImage(this.currImgIdx - 1);
  }

  next() {
    this.loadImage(this.currImgIdx + 1);
  }

  async delete(imgUuid: string) {
    // let delUuid = imgUuid;
    console.log('ImageboxComponent.delete() #236 this.images.length:', this.images.length);
    const idx = this.imageUuidList.indexOf(imgUuid);
    let numDeleted = 0;

    if (idx === -1) {
      console.error('ImageboxComponent.delete(' + imgUuid + ') #230 Image not found');
      // alert('Bild kann nicht gelöscht werden. Unbekannte Bild-ID: ' + imgUuid);
      this.toastr.error('Fehler beim Löschen: Unbekannte Bild-ID ' + imgUuid);
      return;
    }

    if (!confirm('Möchten Sie das Bild wirklich löschen?')) {
      return false;
    }

    if (imgUuid) {
      numDeleted = await this.imgService.deleteByUuid(imgUuid);
      if (numDeleted) {
        this.toastr.success('Bild wurde gelöscht ' + imgUuid);
      }
    }

    if (!numDeleted) {
      console.error('ImageboxComponent.delete(' + imgUuid + ') #247 wurde nicht gelöscht');
      this.toastr.error('Bild konnte nicht gelöscht werden. Bild-ID: ' + imgUuid, 'Fehler');
      return;
    }

    const len = this.imageUuidList.length;
    const newLen = len - 1;
    for (let i = idx; i < len; ++i) {
      if (i < newLen) {
        this.imageUuidList[i] = this.imageUuidList[i + 1];
        this.images[i] = this.images[i + 1];
      }
    }
    this.imageUuidList.length = newLen;
    this.images.length = newLen;
    this.numImages = newLen;

    if (idx < this.images.length && this.images[idx]) {
      this.currImgIdx = idx;
      this.currImg = this.images[idx];
    } else if (this.images.length > 0) {
      this.currImgIdx = this.images.length - 1;
      this.currImg = this.images[ this.currImgIdx ];
    } else {
      this.currImg = null;
      this.currImgIdx = 0;
    }
  }

  async loadImage(imgIdx: number): Promise<boolean> {
    console.log('ImageboxComponent.setImagesUuids #195 loadImage(', imgIdx, ')');
    return new Promise( (resolve, reject) => {
      if (imgIdx < 0) {
        imgIdx = this.numImages - 1;
      } else if (imgIdx > this.numImages - 1) {
        imgIdx = 0;
      }
      if (!this.imageUuidList[imgIdx]) {
        // Error
        this.error = 'Mit dem Index ' + imgIdx + ' ist keine Datei hinterlegt!';
        console.log('ImageboxComponent.setImagesUuids #205 loadImage(', imgIdx, ') reject');
        reject(false);
        return null;
      }
      console.log('ImageboxComponent #220', imgIdx, this.images[imgIdx]);
      if (this.images[imgIdx] !== null
        && typeof this.images[imgIdx] === 'object'
        && 'img' in this.images[imgIdx]
        && 'loadingStatus' in this.images[imgIdx]
        && this.images[imgIdx].loadingStatus === HtmlImageLoadingStatus.Loaded
      ) {
        this.currImgIdx = imgIdx;
        this.currImg = this.images[imgIdx];
        console.log('ImageboxComponent.setImagesUuids #215 loadImage(', imgIdx, ') resolve');
        resolve(true);
        return;
      }

      const uuid = this.imageUuidList[imgIdx];
      if (this.images[imgIdx] === null) {
        this.images[imgIdx] = {
          uuid,
          img: null,
          loadingStatus: HtmlImageLoadingStatus.Pending,
          isDeletable: true,
          isEditable: true
        };
      } else {
        this.images[imgIdx].loadingStatus = HtmlImageLoadingStatus.Pending;
      }
      this.dexie.images.where({uuid}).first()
        .then( row => {
          if (!row) {
            this.error = 'In der Datenbank wurde kein Bild mit UUID ' + uuid + ' gefunden!';
            return;
          }
          ++this.numImgFound;
          this.images[imgIdx] = {
            uuid,
            name: row.name,
            width: row.width,
            height: row.height,
            type: row.type,
            desc: row.desc,
            loadingStatus: HtmlImageLoadingStatus.Loading,
            isDeletable: true,
            isEditable: true,
            img: new Image()
          };
          this.images[imgIdx].img.onload = (ev) => {
            ++this.numImgLoaded;
            ++this.numImgFinished;
            this.currImgIdx = imgIdx;
            this.currImg = this.images[imgIdx];
            this.images[imgIdx].loadingStatus = HtmlImageLoadingStatus.Loaded;
            console.log('ImageboxComponent.setImagesUuids #237 loadImage(', imgIdx, ') resolve');
            console.log('successfull loaded ' + imgIdx + '=' + this.images[imgIdx].img.src);
            resolve(true);
          };
          this.images[imgIdx].img.onerror = (ev) => {
            ++this.numImgFinished;
            this.images[imgIdx].loadingStatus = HtmlImageLoadingStatus.Error;
            this.error = 'Bild ' + row.name + ' konnte nicht geladen werden!';
            console.error('ImageboxComponent.setImagesUuids #243 loadImage(', imgIdx, ') reject');
            console.error('row.data_url = ', row.data_url);
            console.error(ev);
            reject(false);
          };
          this.images[imgIdx].img.onabort = (ev) => {
            ++this.numImgFinished;
            this.images[imgIdx].loadingStatus = HtmlImageLoadingStatus.Aborted;
            this.error = 'Der Ladeprozess für das Bild ' + row.name + ' wurde abgebrochen!';
            console.error('ImageboxComponent.setImagesUuids #249 loadImage(', imgIdx, ') reject');
            console.error(ev);
            reject(false);
          };
          this.images[imgIdx].img.src = row.data_url.replace(/(\r\n|\n|\r)/gm, '');
          // this.images[imgIdx].loadingStatus = HtmlImageLoadingStatus.Loaded;
        })
        .catch(reason => {
          this.error = 'DB(Dexie) Afragefehler ' + JSON.stringify(reason || '');
          console.error('#288 this.dexie.images.get(', uuid , ')');
          console.error(reason);
          reject(false);
        });
    });
  }

}
