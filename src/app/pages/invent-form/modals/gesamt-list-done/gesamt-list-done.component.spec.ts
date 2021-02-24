import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GesamtListDoneComponent } from './gesamt-list-done.component';

describe('GesamtListDoneComponent', () => {
  let component: GesamtListDoneComponent;
  let fixture: ComponentFixture<GesamtListDoneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GesamtListDoneComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GesamtListDoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
