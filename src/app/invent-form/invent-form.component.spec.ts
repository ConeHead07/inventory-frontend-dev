import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InventFormComponent } from './invent-form.component';

describe('InventFormComponent', () => {
  let component: InventFormComponent;
  let fixture: ComponentFixture<InventFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InventFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
