import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInventarComponent } from './edit-inventar.component';

describe('EditInventarComponent', () => {
  let component: EditInventarComponent;
  let fixture: ComponentFixture<EditInventarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditInventarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditInventarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
