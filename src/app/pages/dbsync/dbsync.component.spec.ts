import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DbsyncComponent } from './dbsync.component';

describe('DbsyncComponent', () => {
  let component: DbsyncComponent;
  let fixture: ComponentFixture<DbsyncComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DbsyncComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DbsyncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
