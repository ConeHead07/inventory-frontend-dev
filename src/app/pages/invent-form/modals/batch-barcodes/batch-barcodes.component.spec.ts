import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchBarcodesComponent } from './batch-barcodes.component';

describe('BatchBarcodesComponent', () => {
  let component: BatchBarcodesComponent;
  let fixture: ComponentFixture<BatchBarcodesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BatchBarcodesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchBarcodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
