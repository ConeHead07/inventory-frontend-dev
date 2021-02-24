import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSearchArtikelComponent } from './select-search-artikel.component';

describe('SelectSearchArtikelComponent', () => {
  let component: SelectSearchArtikelComponent;
  let fixture: ComponentFixture<SelectSearchArtikelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectSearchArtikelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectSearchArtikelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
