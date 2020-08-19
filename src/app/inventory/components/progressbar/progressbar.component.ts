import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'app-progressbar',
  templateUrl: './progressbar.component.html',
  styleUrls: ['./progressbar.component.scss']
})
export class ProgressbarComponent implements OnInit {
  @Input() title = 'Fortschrittsanzeige';
  @Input() shortTitle = '';
  @Input() type = 'success';
  @Input() restType = 'danger';
  @Input() value = 0;
  @Input() total = 0;
  @Input() sendDoneClick = false;
  @Input() sendRestClick = false;

  @Output() clickedDone = new EventEmitter();
  @Output() clickedRest = new EventEmitter();

  get short(): string {
    return this.shortTitle ? this.shortTitle : this.title;
  }
  get progressAmount(): number {
    return !this.value
      ? 0
      : (!this.total
        ? 50
        : Math.round(this.value * 1000 / this.total) / 10);
  }
  get progressRest(): number {
    return 100 - this.progressAmount;
  }

  get rest(): number {
    return Math.min(0, this.total - this.value);
  }

  get doneText(): string {
    return this.doneAmountText + this.donePercentText;
  }

  get doneAmountText(): string {
    return this.value + ' Stk';
  }

  get donePercentText(): string {
    return !this.total || this.total === 100 ? '' : ' (' + this.progressAmount + '%)';
  }

  get totalText(): string {
    return (this.total ? this.total.toString() : '??') + ' Stk';
  }

  get restText(): string {
    return (!this.total
      ? '??'
      : (this.total - this.value) + ' Stk' + (!this.total || this.total === 100
        ? ''
        : ' (' + this.progressRest + '%)'));
  }

  get restAmountText(): string {
    return this.total ? '' + Math.max(0, this.total - this.value) + 'Stk' : '';
  }

  get restPercentText(): string {
    return this.total ? '' + this.progressRest + '%' : '';
  }

  constructor() { }

  ngOnInit() {
  }

  onClickDone(e) {
    console.log('onClickDone', { e });
    this.clickedDone.emit(e);
  }

  onClickBarDone(e) {
    e.stopPropagation();
    this.onClickDone(e);
  }

  onClickRest(e) {
    console.log('onClickRest', { e });
    this.clickedRest.emit(e);
  }

}
