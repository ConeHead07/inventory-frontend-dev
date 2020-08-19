import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CropperComponent } from 'angular-cropperjs';
import {ImagesService} from '../../data-services/images.service';

import {
  faCropAlt,
  faSearchPlus, faSearchMinus,
  faUndo, faRedo, faTrashAlt, faTrashRestore, faTrashRestoreAlt,
  faCheck, faBan, faSave,
  faArrowsAlt, faArrowsAltH, faArrowsAltV,
  faDownload, faUpload } from '@fortawesome/free-solid-svg-icons';

const infoLogWorkaround = (...args: any[]): void => {
  args.unshift('[INFO]');
  console.log.apply(console, args);
};

const infoLog = (...args: any[]) => {
  const cons: any = console;
  const consInfo = cons.info || infoLogWorkaround;
  consInfo( args );
};

@Component({
  selector: 'app-create-artikel-image',
  templateUrl: './create-artikel-image.component.html',
  styleUrls: ['./create-artikel-image.component.scss']
})
export class CreateArtikelImageComponent implements OnInit {

  // Get with @ViewChild
  @ViewChild('angularCropper', { static: false })
  public angularCropper: CropperComponent;

  @ViewChild('prepareImgCanvas', { static: true })
  public prepareImgCanvas: ElementRef;

  // Editor-Button-Icons
  faCrop = faCropAlt;
  faMove = faArrowsAlt;
  faSearchPlus = faSearchPlus;
  faSearchMinus = faSearchMinus;
  faRotateLeft = faUndo;
  faRotateRight = faRedo;
  faCheck = faCheck;
  faBan = faBan;
  faSave = faSave;
  faUpload = faUpload;
  faTrash = faTrashAlt;
  faTrashRestore = faTrashRestore;
  faTrashRestoreAlt = faTrashRestoreAlt;



  gcuuid = '';
  name = '';

  allowDelete = false;
  inputFile?: File = null;
  inputImgData = null;
  inputImgType = '';
  inputImgSize = 0;
  inputImgWidth = 0;
  inputImgHeight = 0;
  inputImgSavedData = null;
  previewImgUrl = null;

  config: any = {
    // aspectRatio : 16 / 9,
    autoCrop: false,
    dragMode : 'crop',
    background : true,
    movable: true,
    rotatable : true,
    scalable: true,
    zoomable: true,
    restore: true,
    viewMode: 0,
    checkImageOrigin : true,
    // crop: this.onCrop.bind(this),
    cropmove: this.cropMove.bind(this),
    cropstart: this.cropStart.bind(this),
    cropend: this.cropEnd.bind(this),
    zoom: this.zoomed.bind(this),
    ready: this.onCropperReady.bind(this),
    checkCrossOrigin: true,
    wheelZoomRatio: 0.1,
    toggleDragModeOnDblclick: true
  };
  cropStatus = 0;
  cropApplied = false;
  dragMode = 'move';
  canMove = false;

  imageUrl?: string;

  constructor(public activeModal: NgbActiveModal, private imageService: ImagesService) {
  }

  cropMove(data) {
    this.cropStatus = 3;
    this.previewImgUrl = this.angularCropper.cropper.getCroppedCanvas().toDataURL();
  }

  cropStart(e) {
    this.cropStatus = 2;
  }

  cropEnd(e) {
    if (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].indexOf(e.detail.action) !== -1) {
      this.cropStatus = 5;
    } else if (e.detail.action === 'move') {
      const canvasData = this.angularCropper.cropper.getCanvasData();
      const containerData = this.angularCropper.cropper.getContainerData();
      console.log('cropEnd move', { e, canvasData, containerData });
      let toLeft = canvasData.left > 0 ? 0 : canvasData.left;
      let toTop = canvasData.top > 0 ? 0 : canvasData.top;
      if (canvasData.left > 0 || canvasData.top > 0) {
        this.angularCropper.cropper.moveTo(toLeft, toTop);
      } else {
        let posIsOk = true;
        if (canvasData.top + canvasData.height < containerData.height) {
          toTop = containerData.height - canvasData.height;
          posIsOk = false;
        }
        if (canvasData.left + canvasData.width < containerData.width) {
          toLeft = containerData.width - canvasData.width;
          posIsOk = false;
        }
        if (!posIsOk) {
          this.angularCropper.cropper.moveTo(toLeft, toTop);
        }
      }
    }
  }

  onCrop(e) {
    // console.log('onCrop Details: ', e.details);
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

    this.canMove = Math.abs(minRatioW - ratio) > 0.01;
  }

  ngOnInit(): void {
    console.log('#39 CreateArtikelImageComponent ngOniInit');
    this.dragMode = this.config.dragMode;
  }

  onInputImageFile(event: Event, elm: HTMLInputElement) {
    console.log('onInputImageFile', { event });
    if (elm.files.length) {
      this.inputFile = elm.files[0];
    } else {
      this.inputFile = null;
    }
    this.prepareInputImageFile();
  }

  prepareInputImageFile() {
    if (!this.inputFile) {
      return;
    }
    this.inputImgSize = this.inputFile.size;
    this.inputImgType = this.inputFile.type;

    console.log('Filesize of ' + this.inputFile.name + ' (' + this.inputFile.type + ') is ' + this.inputFile.size);
    const rd = new FileReader();
    rd.onload = (ev: ProgressEvent) => {
      console.log(ev);
      this.inputImgData = rd.result;
      const img = new Image();
      img.onerror = (err) => {
        console.error('Cannot load file as image', { err });
      };

      img.onload = (imgLoadEv) => {
        console.log('im onlad', { imgLoadEv });
        this.inputImgWidth = img.width;
        this.inputImgHeight = img.height;
        console.log(`Img W: ${this.inputImgWidth}, H: ${this.inputImgHeight}`);
        const KB = 1024;
        console.log( 'this.prepareImgCanvas', this.prepareImgCanvas);

        if (this.inputImgHeight > 2000 || this.inputImgWidth > 2000) {
          const canv: HTMLCanvasElement = this.prepareImgCanvas.nativeElement;
          const ctx = canv.getContext('2d');
          const iRel = this.inputImgWidth / this.inputImgHeight;
          canv.width = (iRel > 1) ? 2000 : (2000 * iRel);
          canv.height = (iRel > 1) ? (2000 / iRel) : 2000;
          ctx.drawImage(img, 0, 0, this.inputImgWidth, this.inputImgHeight, 0, 0, canv.width, canv.height);
          this.imageUrl = canv.toDataURL('image/jpeg', 0.7);
        } else if (this.inputImgSize > 200 * KB) {
          // 1264270 => 1.235 KB
          const canv: HTMLCanvasElement = this.prepareImgCanvas.nativeElement;
          const ctx = canv.getContext('2d');
          const iRel = this.inputImgWidth / this.inputImgHeight;
          canv.width = this.inputImgWidth
          canv.height = this.inputImgHeight;
          ctx.drawImage(img, 0, 0);
          this.imageUrl = canv.toDataURL('image/jpeg', 0.7);
        } else {
          this.imageUrl = this.inputImgData;
        }
      }

      console.log('Assign DataUrl to img. ', this.inputImgData);
      img.src = this.inputImgData;

    };

    rd.onprogress = (ev: ProgressEvent) => {
      console.log('read ' + ev.loaded + ' of ' + ev.total);
    };
    rd.readAsDataURL(this.inputFile);
    // const img = new Image();
    // img.src = null;
    // if (this.inputFile.size) {
    // }
  }

  onCropperReady(data) {
    console.log('called onCropperReady on this: ', this, 'this.angularCropper:', this.angularCropper, ' data: ', data);
    if (!this.angularCropper.isLoading && typeof this.angularCropper.cropper !== 'undefined') {
      this.angularCropper.cropper.setDragMode( this.config.dragMode );
      this.dragMode = this.config.dragMode;
      return;
    }

    this.angularCropper.ready.subscribe( (data2) => {
      console.log('ready subscribe', { data2 });
      this.angularCropper.cropper.setDragMode( this.config.dragMode );
      this.dragMode = this.config.dragMode;
    });
  }

  crop() {
    console.log('crop this.angularCropper:', this.angularCropper);
    this.imageUrl = this.angularCropper.cropper.getCroppedCanvas().toDataURL('image/jpeg');
    this.cropApplied = true;
    this.angularCropper.cropper.clear();
    this.cropStatus = 0;
  }
  cropReset() {
    console.log('reset this.angularCropper:', this.angularCropper);
    this.angularCropper.cropper.clear();
    this.angularCropper.cropper.reset();
    this.cropStatus = 0;
  }
  setDragModeToMove() {
    this.angularCropper.cropper.setDragMode( 'move' );
    this.dragMode = 'move';
    if (this.cropStatus === 1) {
      this.cropStatus = 0;
    }
  }
  setDragModeToCrop() {
    this.angularCropper.cropper.setDragMode( 'crop' );
    this.angularCropper.cropper.crop();
    this.dragMode = 'crop';
    this.cropStatus = 5;
  }
  hideCropBox() {
    this.angularCropper.cropper.clear();
  }
  rotateLeft() {
    // console.log('rotate left 90 this.angularCropper:', this.angularCropper);
    this.angularCropper.cropper.rotate(-90);
  }
  rotateRight() {
    // console.log('rotate right 90 this.angularCropper:', this.angularCropper);
    this.angularCropper.cropper.rotate(90);
  }
  rotate180() {
    // console.log('rotate 180 this.angularCropper:', this.angularCropper);
    this.angularCropper.cropper.rotate(180);
  }
  zoomIn() {
    // console.log('zoom( 0.1) this.angularCropper:', this.angularCropper);
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
    this.inputImgSavedData = null;
    this.inputImgData = null;
  }
  close() {
    this.escape();
    this.activeModal.close();
  }
  async save() {
    console.log('save this.angularCropper:', this.angularCropper);
    this.angularCropper.cropper.disable();
    const cropData = this.angularCropper.cropper.getImageData();
    this.inputImgSavedData = this.angularCropper.cropper.getCroppedCanvas().toDataURL('image/jpeg');
    return this.imageService.insertImage({
      name: this.name,
      type: 'image/jpeg',
      size: this.inputImgSavedData.toString().length,
      width: cropData.width,
      height: cropData.height,
      gcuuid: this.gcuuid,
      data_url: this.inputImgSavedData
    }).then( () => {
      this.activeModal.close();
      return true;
    }).catch( (err) => {
      console.error( 'Cannot save Image', { err });
      this.angularCropper.cropper.enable();
      return false;
    });
  }

  cropSave() {
    this.crop();
    this.save();
  }
}
