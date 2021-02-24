import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCreateRaumComponent } from './select-create-raum.component';

describe('SelectCreateRaumComponent', () => {
  let component: SelectCreateRaumComponent;
  let fixture: ComponentFixture<SelectCreateRaumComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectCreateRaumComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectCreateRaumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
