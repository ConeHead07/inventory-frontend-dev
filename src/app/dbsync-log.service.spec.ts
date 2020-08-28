import { TestBed } from '@angular/core/testing';

import { DbsyncLogService } from './dbsync-log.service';

describe('DbsyncLogService', () => {
  let service: DbsyncLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbsyncLogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
