import {Component, EventEmitter, HostListener, Input, OnInit, Output} from '@angular/core';

export interface ScanDetectData {
  barcode: string;
  length: number;
  valid: boolean;
  rawInput?: string;
  debugData?: any;
  target?: HTMLElement;
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
  private rawInput = '';
  private keyDownEvents: any[] = [];
  private lastKeyEventTime = 0;
  private lastTimer = null;
  private lastTimerTime = null;
  private isInDebugMode = false;

  private detectorConfig: ScanDetectConfig = {
    minLength: 5,
    maxLength: 32,
    scannerStartsWith: '',
    scannerEndsWith: '',
    scanTimeout: 100,
    ignoreChars: '',
    ignoreEndsWith: true,
    ignoreOverElements: ['.scanner-detect-ignore'], // [ 'INPUT' ],
    barcodeType: 'code128'
  };

  @Input()
  set config(input: ScanDetectConfig) {
    this.detectorConfig = Object.assign(this.detectorConfig, input);
  }

  @Output() scanned: EventEmitter<ScanDetectData> = new EventEmitter();

  @HostListener('window:keydown', ['$event', '$event.target'])
  onKeyDown(event: KeyboardEvent, useTarget?: HTMLElement) {
    if (this.isInDebugMode) {
      console.log('#55 scannerDetection Key-Down-Event', { event, useTarget });
    }

    const target: HTMLElement = useTarget;
    const targetTagName = target.tagName;
    const targetElementId = target.id;
    const targetClassName = target.className;
    const ignoreElements = this.detectorConfig.ignoreOverElements;
    let emitScanData = true;

    const ignoreTagNames = ignoreElements
      .filter( name => !name.startsWith('.') && !name.startsWith('#'))
      .map( name => name.toUpperCase());

    const ignoreElementIds = ignoreElements
      .filter( name => name.startsWith('#'))
      .map(name => name.substr(1));

    const ignoreClassNames = ignoreElements
      .filter( name => name.startsWith('.'))
      .map(name => name.substr(1));

    const isEditableTextInput = (
      target instanceof HTMLInputElement
      && target.tagName === 'input'
      && target.type.match(/text|number|/)
      && !target.readOnly
      && !target.disabled
    );

    if (ignoreElementIds.indexOf( targetElementId ) !== -1) {
      emitScanData = false;
    }

    if (ignoreClassNames.indexOf( targetClassName ) !== -1) {
      emitScanData = false;
    }

    if (ignoreTagNames.indexOf( targetTagName ) !== -1) {
      emitScanData = false;
    }

    if (isEditableTextInput) {
      emitScanData = false;
    }

    if (!emitScanData && this.isInDebugMode) {
      console.log('#89 scannerDetection target is not our target: ', {
        useTarget,
        isEditableTextInput,
        ignoreTagNames,
        ignoreElementIds,
        ignoreClassNames
      });
      return;
    }

    const now = Date.now();
    const diff = now - this.lastKeyEventTime;
    const isScanInput: boolean = diff > this.detectorConfig.scanTimeout;
    const key = 'key' in event ? event.key : '';
    const isShiftKey = event.shiftKey;

    if (!isScanInput) {
      this.input = key;
      this.rawInput = key;
      if (this.isInDebugMode) {
        console.log('#101 scannerDetection Start, input', this.input);
      }
    } else {
      this.rawInput += '|' + key;
      if (this.isInDebugMode) {
        console.log('#109 scannerDetection isScanInput', { target, key, 'this.input': this.input, 'event.type': event.type, event});
      }
      if (key.length === 1 ) {
        this.input += !isShiftKey ? key : key.toUpperCase();
        const barcode = this.input;
        if (this.isInDebugMode) {
          console.log('#106 scannerDetection add Char to Barcode', { key, barcode });
        }
      } else if (key === 'Tab') {
        this.input += '\t';
      } else if (key === 'Enter') {
        this.input += '\n';
      }
    }

    this.lastTimerTime = now;
    if (this.lastTimer) {
      clearTimeout(this.lastTimer);
    }
    this.lastTimer = setTimeout( () => {
      let input = this.input;
      if (input.indexOf('ß') !== -1) {
        input = input.split('ß').join('-');
      }
      const barcode = input;
      const rawInput = this.rawInput;
      const keyDownEvents = this.keyDownEvents;
      if (this.isInDebugMode) {
        console.log('#138 scannerDetection Emit After Timeout', { key, barcode });
      }
      this.input = '';
      if (barcode.length >= 5) {
        this.scanned.emit({
          barcode,
          rawInput,
          length: barcode.length,
          valid: true,
          debugData: {
            keyDownEvents
          }
        });
      }
    }, this.detectorConfig.scanTimeout);
  }

  constructor() { }

  ngOnInit() {
  }

}
