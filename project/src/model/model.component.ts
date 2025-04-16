import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

declare let Plotly: any;

@Component({
  selector: 'app-model',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './model.component.html',
  styleUrl: './model.component.scss'
})
export class ModelComponent implements OnInit {
  form: FormGroup;
  z: Expression | undefined;
  restrictions: Array<Restriction> = [];
  // datasets: any = [];
  // labels: any = [];

  constructor(private fBuilder: FormBuilder) {
    this.z = new Expression(0, 0);

    this.form = this.fBuilder.group({
      'a1': [this.z.a1, Validators.compose([
        Validators.required])],
      'a2': [this.z.a2, Validators.compose([
        Validators.required])],
    });

  }

  ngOnInit() {
    this.addRestriction();
  }

  addRestriction() {

    let restrictionsCopy: Array<Restriction> = [];
    restrictionsCopy = Array.from(this.restrictions);
    restrictionsCopy.push(new Restriction(0, 0, 0, 0));

    this.restrictions = [];

    restrictionsCopy.forEach((r) => {
      this.restrictions.push(r);
    })
    console.log(this.restrictions);

  }

  removeRestriction() {
    this.restrictions.pop();
  }

  setRestrictions() {

    let traces: { x: number[]; y: number[]; type: string; }[] = [];

    this.restrictions.forEach((r, index) => {

      let x1, x2: number;

      x1 = r.b / r.a1;
      x2 = r.b / r.a2;

      traces.push({
        x: [0, x1],
        y: [x2, 0],
        type: 'scatter'
      });

    });

    Plotly.newPlot('plot', traces);
  }

  // plotLine(title: string, plotDiv: string, x: number[], y: number[]) {
  //   let trace = {
  //     x: x,
  //     y: y,
  //     type: 'scatter'
  //   };

  //   let layout = {
  //     title: title
  //   };

  //   Plotly.newPlot(plotDiv, [trace], layout);
  // }

  handleEvent($event: any) {
    console.log($event);
  }
}

class Expression {
  a1: number;
  a2: number;

  constructor(a1: number, a2: number) {
    this.a1 = a1;
    this.a2 = a2;
  }
}

class Restriction {
  a1: number;
  a2: number;
  eq: number;
  // <= -1; = 0; >= 1
  b: number;

  constructor(a1: number, a2: number, eq: number, b: number) {
    this.a1 = a1;
    this.a2 = a2;
    this.eq = eq;
    this.b = b;
  }
}