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
  private keyDownEvents: KeyboardEvent[] = [];
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
    ignoreOverElements: [], // [ 'INPUT' ],
    barcodeType: 'code128'
  };

  @Input()
  set config(input: ScanDetectConfig) {
    this.detectorConfig = Object.assign(this.detectorConfig, input);
  }

  @Output() scanned: EventEmitter<ScanDetectData> = new EventEmitter();

  @HostListener('window:keydown', ['$event', '$event.target'])
  onKeyDown(event: KeyboardEvent, useTarget?: HTMLElement) {
    console.log('#55 scannerDetection Key-Down-Event', { event, useTarget });

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

    if (!emitScanData) {
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
    // const isEnterKey = event.metaKey;

    if (!isScanInput) {
      this.input = key;
      this.rawInput = '|' + key;
      console.log('#101 scannerDetection Start, input', this.input, 'diff', diff);
    } else {
      this.rawInput = '|' + key;
      console.log('#109 scannerDetection isScanInput', { diff, target, key, 'this.input': this.input, 'event.type': event.type, event});
      if (key.length === 1 ) {
        this.input += !isShiftKey ? key : key.toUpperCase();
        const barcode = this.input;
        console.log('#106 scannerDetection add Char to Barcode', { key, barcode });
      } else if (key === 'Tab' || key === 'Enter') {
        // Nothing
        // event.preventDefault();
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
      console.log('#138 scannerDetection Emit After Timeout', { key, barcode });
      this.input = '';
      if (barcode.length >= 5) {
        this.scanned.emit({
          barcode,
          rawInput: this.rawInput,
          length: barcode.length,
          valid: true
        });
      }
    }, this.detectorConfig.scanTimeout);
    console.log('#147 scannerDetection LAST-LINE');
  }

  constructor() { }

  ngOnInit() {
  }

}
