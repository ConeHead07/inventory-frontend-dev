import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateArtikelImageComponent } from './create-artikel-image.component';

describe('CreateArtikelImageComponent', () => {
  let component: CreateArtikelImageComponent;
  let fixture: ComponentFixture<CreateArtikelImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateArtikelImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateArtikelImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
