import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AddMovePage } from './add-move.page';

describe('AddMovePage', () => {
  let component: AddMovePage;
  let fixture: ComponentFixture<AddMovePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddMovePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddMovePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
