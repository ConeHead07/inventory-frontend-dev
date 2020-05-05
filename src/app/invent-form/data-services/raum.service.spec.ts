import { TestBed } from '@angular/core/testing';

import { RaumService } from './raum.service';

describe('RaumService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RaumService = TestBed.get(RaumService);
    expect(service).toBeTruthy();
  });
});
