import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannerdetectionComponent } from './scannerdetection.component';

describe('ScannerdetectionComponent', () => {
  let component: ScannerdetectionComponent;
  let fixture: ComponentFixture<ScannerdetectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScannerdetectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScannerdetectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
