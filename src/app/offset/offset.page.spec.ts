import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OffsetPage } from './offset.page';

describe('OffsetPage', () => {
  let component: OffsetPage;
  let fixture: ComponentFixture<OffsetPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OffsetPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(OffsetPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
