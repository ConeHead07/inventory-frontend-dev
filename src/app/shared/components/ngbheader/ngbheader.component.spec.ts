import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgbheaderComponent } from './ngbheader.component';

describe('NgbheaderComponent', () => {
  let component: NgbheaderComponent;
  let fixture: ComponentFixture<NgbheaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgbheaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgbheaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
