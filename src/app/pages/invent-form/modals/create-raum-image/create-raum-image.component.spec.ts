import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateRaumImageComponent } from './create-raum-image.component';

describe('CreateRaumImageComponent', () => {
  let component: CreateRaumImageComponent;
  let fixture: ComponentFixture<CreateRaumImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateRaumImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateRaumImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
