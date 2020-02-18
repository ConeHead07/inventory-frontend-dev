import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-progressbar',
  templateUrl: './progressbar.component.html',
  styleUrls: ['./progressbar.component.scss']
})
export class ProgressbarComponent implements OnInit {
  @Input() private title = 'Fortschrittsanzeige';
  @Input() private shortTitle = '';
  @Input() private type = 'success';
  @Input() private restType = 'danger';
  @Input() private value = 0;
  @Input() private total = 0;

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

}
