import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { DataManagerService } from '../data-manager.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
})
export class IntroPage implements OnInit {

  constructor(private router: Router, private dataManager: DataManagerService) { }

  ngOnInit() {
    this.dataManager.onLogIn.subscribe(() => {
      console.log("onLogIn");
      this.checkIntroSeen();
    });
  }

  ngOnDestroy(){
    this.dataManager.onLogIn.unsubscribe();
  }

  slideNext(slides){
    document.querySelector("ion-slides").slideNext();
  }

  checkIntroSeen(){
    localStorage.introSeen = true;
    this.router.navigateByUrl('/home');
  }
}
