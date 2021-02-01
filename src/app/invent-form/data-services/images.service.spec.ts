import { TestBed } from '@angular/core/testing';
import {} from 'jasmine';

import { ImagesService } from './images.service';

describe('ImagesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ImagesService = TestBed.get(ImagesService);
    expect(service).toBeTruthy();
  });
});
