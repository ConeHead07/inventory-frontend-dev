import { TestBed } from '@angular/core/testing';
import {} from 'jasmine';

import { DbsyncLogService } from './dbsync-log.service';

describe('DbsyncLogService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DbsyncLogService = TestBed.get(DbsyncLogService);
    expect(service).toBeTruthy();
  });
});
