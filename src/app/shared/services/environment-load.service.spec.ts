import { TestBed } from '@angular/core/testing';

import { ClientConfigLoadService } from './client-config-load.service';

describe('EnvironmentLoadService', () => {
  let service: ClientConfigLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientConfigLoadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
