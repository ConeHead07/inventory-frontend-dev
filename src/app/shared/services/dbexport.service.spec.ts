import { TestBed } from '@angular/core/testing';

import { DbexportService } from './dbexport.service';

describe('DbexportService', () => {
  let service: DbexportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbexportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
