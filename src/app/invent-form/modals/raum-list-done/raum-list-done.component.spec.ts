import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RaumListDoneComponent } from './raum-list-done.component';

describe('RaumListDoneComponent', () => {
  let component: RaumListDoneComponent;
  let fixture: ComponentFixture<RaumListDoneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RaumListDoneComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RaumListDoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
