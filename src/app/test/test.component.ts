import { Component, OnInit } from '@angular/core';
import {AppComponent} from '../app.component';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {
  private title = '';
  private isToggled = false;
  constructor(private app: AppComponent) {
    this.title = app.title;
  }

  onAlertClose( alertElm ) {
    console.log('close alert', arguments);
    alertElm.remove();
  }
  ngOnInit(): void { }

  onToggle() {
    this.isToggled = !this.isToggled;
  }

  onClick_c1_1_1() {
    console.log('click c1_1_1');
  }

  onClick_c1_1_2() {
    console.log('click c1_1_2');
  }

  onClick_c1_1() {
    console.log('click c1_1');
  }

  onAddAnA() {
    this.title += 'a';
  }

  get titleEndWithAnA(): boolean {
    return this.title.endsWith('a');
  }

}
