import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditRaumComponent } from './edit-raum.component';

describe('EditRaumComponent', () => {
  let component: EditRaumComponent;
  let fixture: ComponentFixture<EditRaumComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditRaumComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditRaumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
