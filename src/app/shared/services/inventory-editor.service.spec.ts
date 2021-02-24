import { TestBed } from '@angular/core/testing';

import { InventoryEditorService } from './inventory-editor.service';

describe('InventoryEditorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: InventoryEditorService = TestBed.get(InventoryEditorService);
    expect(service).toBeTruthy();
  });
});
