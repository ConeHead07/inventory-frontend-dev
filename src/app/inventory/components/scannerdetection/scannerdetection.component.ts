import {Component, EventEmitter, HostListener, Input, OnInit, Output} from '@angular/core';

export interface ScanDetectData {
  barcode: string;
  length: number;
  valid: boolean;
}

export interface ScanDetectConfig {
  minLength?: number;
  maxLength?: number;
  scannerStartsWith?: string;
  scannerEndsWith?: string;
  scanTimeout?: number;
  ignoreChars?: string;
  ignoreEndsWith?: boolean;
  ignoreOverElements?: string[];
  barcodeType?: string;
}

@Component({
  selector: 'app-scannerdetection',
  templateUrl: './scannerdetection.component.html',
  styleUrls: ['./scannerdetection.component.scss']
})
export class ScannerdetectionComponent implements OnInit {

  private input = '';
  private lastKeyEventTime = 0;
  private lastTimer = null;
  private lastTimerTime = null;

  private detectorConfig: ScanDetectConfig = {
    minLength: 5,
    maxLength: 32,
    scannerStartsWith: '',
    scannerEndsWith: '',
    scanTimeout: 100,
    ignoreChars: '',
    ignoreEndsWith: true,
    ignoreOverElements: [ 'INPUT' ],
    barcodeType: 'code128'
  };

  @Input()
  set config(input: ScanDetectConfig) {
    this.detectorConfig = Object.assign(this.detectorConfig, input);
  }

  @Output() scanned: EventEmitter<ScanDetectData> = new EventEmitter();

  @HostListener('window:keyup', ['$event', '$event.target'])
  onKeyUp(event: KeyboardEvent, target) {
    console.log('scannerDetection onKeyUp');
    const targetTagName = target.tagName;
    const ignoreTagNames = this.detectorConfig.ignoreOverElements;
    if (ignoreTagNames.indexOf( targetTagName ) !== -1) {
      console.log('scannerDetection not our element', { targetTagName, ignoreTagNames});
      return;
    }

    const now = Date.now();
    const diff = now - this.lastKeyEventTime;
    const isScanInput = diff > this.detectorConfig.scanTimeout;
    const key = event.key;
    const code = event.code;
    const isCtrlKey = event.ctrlKey;

    if (!isScanInput) {
      this.input = key;
      console.log('#70 scannerDetection nochKeinScannerStream oder Start, input', this.input);
    } else {
      if (key.length === 1 ) {
        this.input += key;
        console.log('#74 scannerDetection verarbeite scannerStream, input', this.input);
      } else {
        const barcode = this.input;
        console.log('#77 scannerDetection verpacke scannerStream, input', this.input);
        this.input = '';
        if (this.lastTimer) {
          clearTimeout( this.lastTimer );
        }
        console.log('#82 scannerDetection emit scannerStream, input', this.input);
        this.scanned.emit({
          barcode,
          length: barcode.length,
          valid: true
        });
        return;
      }
    }

    if (this.lastTimer && now - this.lastTimerTime < this.detectorConfig.scanTimeout ) {
      console.log('#93 scannerDetection setTimeout wurde bereits gestartet', this.lastTimerTime);
      return;
    }

    console.log('#97 scannerDetection');
    this.lastTimerTime = now;
    this.lastTimer = setTimeout( () => {
      console.log('#100 scannerDetection');
      const barcode = this.input;
      if (barcode.length > 7) {
        console.log('#103 scannerDetection');
        this.scanned.emit({
          barcode,
          length: barcode.length,
          valid: true
        });
      }
    }, this.detectorConfig.scanTimeout);
    console.log('#111 scannerDetection LAST-LINE');

  }

  constructor() { }

  ngOnInit() {
  }

}
