import { TestBed } from '@angular/core/testing';
import {} from 'jasmine';

import { InventarService } from './inventar.service';

describe('InventarService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: InventarService = TestBed.get(InventarService);
    expect(service).toBeTruthy();
  });
});
