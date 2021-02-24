import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RaumListRestComponent } from './raum-list-rest.component';

describe('RaumListRestComponent', () => {
  let component: RaumListRestComponent;
  let fixture: ComponentFixture<RaumListRestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RaumListRestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RaumListRestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
