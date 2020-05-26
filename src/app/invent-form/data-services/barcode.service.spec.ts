import { TestBed } from '@angular/core/testing';

import { BarcodeService } from './barcode.service';

describe('BarcodeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BarcodeService = TestBed.get(BarcodeService);
    expect(service).toBeTruthy();
  });
});
