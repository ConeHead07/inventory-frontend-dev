import { Component, OnInit } from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-show-artikel-image',
  templateUrl: './show-artikel-image.component.html',
  styleUrls: ['./show-artikel-image.component.scss']
})
export class ShowArtikelImageComponent implements OnInit {

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

}
