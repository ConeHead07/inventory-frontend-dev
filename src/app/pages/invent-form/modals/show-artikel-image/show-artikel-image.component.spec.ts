import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowArtikelImageComponent } from './show-artikel-image.component';

describe('ShowArtikelImageComponent', () => {
  let component: ShowArtikelImageComponent;
  let fixture: ComponentFixture<ShowArtikelImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowArtikelImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowArtikelImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
