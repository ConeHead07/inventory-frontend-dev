import { TestBed } from '@angular/core/testing';

import { InventoryProgressService } from './inventory-progress.service';

describe('InventoryProgressService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: InventoryProgressService = TestBed.get(InventoryProgressService);
    expect(service).toBeTruthy();
  });
});
