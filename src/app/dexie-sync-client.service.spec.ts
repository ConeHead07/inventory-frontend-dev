import { TestBed } from '@angular/core/testing';

import { DexieSyncClientService } from './dexie-sync-client.service';

describe('DexieSyncClientService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DexieSyncClientService = TestBed.get(DexieSyncClientService);
    expect(service).toBeTruthy();
  });
});
