import { TestBed } from '@angular/core/testing';

import { DBSyncClientService } from './dbsync-client.service';

describe('DBSyncClientService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DBSyncClientService = TestBed.get(DBSyncClientService);
    expect(service).toBeTruthy();
  });
});
