import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCreateArtikelComponent } from './select-create-artikel.component';

describe('SelectCreateArtikelComponent', () => {
  let component: SelectCreateArtikelComponent;
  let fixture: ComponentFixture<SelectCreateArtikelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectCreateArtikelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectCreateArtikelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
