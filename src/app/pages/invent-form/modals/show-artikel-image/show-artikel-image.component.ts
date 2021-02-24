import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {ImagesService} from '../../data-services/images.service';

import {
  faCropAlt,
  faSearchPlus, faSearchMinus,
  faUndo, faRedo,
  faCheck, faBan,
  faArrowsAlt, faTimes, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import {CropperComponent} from 'angular-cropperjs';

@Component({
  selector: 'app-show-artikel-image',
  templateUrl: './show-artikel-image.component.html',
  styleUrls: ['./show-artikel-image.component.scss']
})
export class ShowArtikelImageComponent implements OnInit {
  // Editor-Button-Icons
  faCrop = faCropAlt;
  faMove = faArrowsAlt;
  faSearchPlus = faSearchPlus;
  faSearchMinus = faSearchMinus;
  faRotateLeft = faUndo;
  faRotateRight = faRedo;
  faCheck = faCheck;
  faBan = faBan;
  faClose = faTimes;

  // Get with @ViewChild
  @ViewChild('angularCropper', { static: false })
  public angularCropper: CropperComponent;

  mcuuid?: string = null;
  gcuuid?: string = null;
  inputFile?: File = null;
  previewEnable = false;
  imageUrl = null;
  maxWidth = 600;
  maxHeight = 600;
  error = '';
  config: any = {
    // aspectRatio : 16 / 9,
    autoCrop: false,
    dragMode : 'move',
    background : true,
    movable: true,
    rotatable : true,
    scalable: true,
    zoomable: true,
    restore: true,
    viewMode: 0,
    checkImageOrigin : true,
    cropend: this.cropEnd.bind(this),
    zoom: this.zoomed.bind(this),
    // ready: this.onCropperReady.bind(this),
    checkCrossOrigin: true,
    wheelZoomRatio: 0.1,
    toggleDragModeOnDblclick: true
  };
  cropStatus = 0;

  constructor(public activeModal: NgbActiveModal, private imageService: ImagesService) { }

  ngOnInit() {
    console.log('called ShowArtikelImageComponent.ngOnInit');
  }

  setMcuuid(mcuuid: string, gcuuid: string = '') {
    this.mcuuid = mcuuid;
    this.gcuuid = gcuuid;
    console.log('called setMcuuid', this.mcuuid);
    this.loadImageByMcuuid(this.mcuuid).then( mSuccess => {
      if (!mSuccess && gcuuid) {
        this.loadImageByGcuuid(this.gcuuid).then( gSuccess => {
          if (!gSuccess) {
            alert('Bild konnte leider nicht geladen werden!');
          }
        });
      }
    }, err => {
      if (gcuuid) {
        this.loadImageByGcuuid(this.gcuuid).then( gSuccess => {
          if (!gSuccess) {
            alert('Bild konnte leider nicht geladen werden!');
          }
        });
      } else {
        alert('Bild konnte leider nicht geladen werden!');
      }
    });
  }

  async loadImageByMcuuid(mcuuid: string): Promise<boolean> {
    console.log('called loadImageByGcuuid', mcuuid);
    if (mcuuid) {
      return this.imageService.getImageByMcuuid(mcuuid)
        .then( image => {
          if (image) {
            this.imageUrl = image.data_url;
            return true;
          }
          return false;
        })
        .catch( err => {
          console.error( err );
          return false;
        });
    }
    return false;
  }

  async loadImageByGcuuid(gcuuid: string): Promise<boolean> {
    console.log('called loadImageByGcuuid', gcuuid);
    if (gcuuid) {
      return this.imageService.getImageByGcuuid(gcuuid)
        .then( image => {
          if (image) {
            this.imageUrl = image.data_url;
            return true;
          }
          return false;
        })
        .catch( err => {
          console.error( err );
          return false;
        });
    }
    return false;
  }

  zoomed(e) {
    console.log('zoomListener Event: ', e, 'this.angularCropper: ', this.angularCropper);
    const canvasData = this.angularCropper.cropper.getCanvasData();
    const containerData = this.angularCropper.cropper.getContainerData();
    const ratio = e.detail.ratio;
    const oldRatio = e.detail.oldRatio;
    const minRatioW = containerData.width / canvasData.naturalWidth;
    const minRatioH = containerData.height / canvasData.naturalHeight;

    if (ratio < oldRatio && (ratio < minRatioW || ratio < minRatioH) ) { // Zoom-Out
      e.preventDefault(); // Prevent zoom out
      return false;
    }
  }

  cropEnd(e) {
    if (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].indexOf(e.detail.action) !== -1) {
      this.cropStatus = 5;
    } else if (e.detail.action === 'move') {
      const canvasData = this.angularCropper.cropper.getCanvasData();
      const containerData = this.angularCropper.cropper.getContainerData();
      console.log('cropEnd move', { e, canvasData, containerData });
      const toLeft = canvasData.left > 0 ? 0 : canvasData.left;
      const toTop = canvasData.top > 0 ? 0 : canvasData.top;
      if (canvasData.left > 0 || canvasData.top > 0) {
        this.angularCropper.cropper.moveTo(toLeft, toTop);
      }
    }
  }

  rotateLeft() {
    this.angularCropper.cropper.rotate(-90);
  }
  rotateRight() {
    this.angularCropper.cropper.rotate(90);
  }
  rotate180() {
    this.angularCropper.cropper.rotate(180);
  }
  zoomIn() {
    const canvasData = this.angularCropper.cropper.getCanvasData();
    console.log('zoomIn ', { canvasData });
    this.angularCropper.cropper.zoom(.1);
  }
  zoomOut(useRatio?: number) {
    const ratio = (typeof useRatio === 'undefined' || useRatio >= 0) ? -0.1 : useRatio;
    console.log('zoom( -0.1) this.angularCropper:', this.angularCropper);
    const canvasData = this.angularCropper.cropper.getCanvasData();
    const cropBoxData = this.angularCropper.cropper.getCropBoxData();
    const containerData = this.angularCropper.cropper.getContainerData();
    const cad = canvasData;
    const crd = cropBoxData;
    const cod = containerData;
    const caw = cad.width;
    const cah = cad.height;
    const crw = crd.width;
    const crh = crd.height;
    const cow = cod.width;
    const coh = cod.height;
    console.log({ratio, caw, cah, cow, coh, crw, crh, canvasData, cropBoxData, containerData });
    if (caw < cow || cah < coh) {
      console.error('Permission denied to zoom out smaller than canvas');
      return;
    }
    console.log('Permission allowed to zoom out >= canvas');
    this.angularCropper.cropper.zoom(ratio);
  }
  escape() {
    this.imageUrl = null;
  }
  close() {
    this.escape();
    this.activeModal.close();
  }

}
