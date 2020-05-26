import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GesamtListRestComponent } from './gesamt-list-rest.component';

describe('GesamtListRestComponent', () => {
  let component: GesamtListRestComponent;
  let fixture: ComponentFixture<GesamtListRestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GesamtListRestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GesamtListRestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
