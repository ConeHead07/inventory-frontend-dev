import { TestBed } from '@angular/core/testing';

import { DummieSeederService } from './dummie-seeder.service';

describe('DummieSeederService', () => {
  let service: DummieSeederService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DummieSeederService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
