import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-create-artikel-image',
  templateUrl: './create-artikel-image.component.html',
  styleUrls: ['./create-artikel-image.component.scss']
})
export class CreateArtikelImageComponent implements OnInit {
  @Input() name;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

}
