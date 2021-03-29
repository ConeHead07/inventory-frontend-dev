import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowRaumImageComponent } from './show-raum-image.component';

describe('ShowRaumImageComponent', () => {
  let component: ShowRaumImageComponent;
  let fixture: ComponentFixture<ShowRaumImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowRaumImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowRaumImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
