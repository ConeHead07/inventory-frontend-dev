import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSearchRaumComponent } from './select-search-raum.component';

describe('SelectSearchRaumComponent', () => {
  let component: SelectSearchRaumComponent;
  let fixture: ComponentFixture<SelectSearchRaumComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectSearchRaumComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectSearchRaumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
