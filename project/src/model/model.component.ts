import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import * as math from 'mathjs';
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
  zFunction: any;
  optimization: number = 1;
  restrictions: Array<Restriction> = [];
  restrictionFunctions: Array<any> = [];
  restrictionExpressions: Array<any> = [];
  interestPoints: Array<Point> = [];
  solution: Point | undefined;

  constructor(private fBuilder: FormBuilder) {
    this.z = new Expression(0, 0);

    this.form = this.fBuilder.group({
      'a1': [this.z.a1, Validators.required],
      'a2': [this.z.a2, Validators.required],
      'optimization': [this.optimization, Validators.required]
    });

  }

  ngOnInit() {

    // essa função é executada na inicialização da página

  }

  addRestriction() {

    // essa função adiciona uma restrição ao problema

    let restrictionsCopy: Array<Restriction> = [];
    restrictionsCopy = Array.from(this.restrictions);
    restrictionsCopy.push(new Restriction(0, 0, 0, 0));

    this.restrictions = [];

    restrictionsCopy.forEach((r) => {
      this.restrictions.push(r);
    });
  }

  removeRestriction() {

    // essa função retira uma restrição do problema

    this.restrictions.pop();
  }

  findInterestPoints() {

    // essa função encontra os pontos de interesse para a maximização/minimização

    let traces: Array<Trace> = [];
    for (let i = 0; i < this.restrictions.length - 1; i++) {
      for (let j = i + 1; j < this.restrictions.length; j++) {
        const r1: Restriction = this.restrictions[i];
        const r2: Restriction = this.restrictions[j];

        const a = [[r1.a1, r1.a2], [r2.a1, r2.a2]]
        const b = [r1.b, r2.b];
        const sol = math.lusolve(a, b);
        if (sol != undefined) {
          this.interestPoints.push(new Point(math.round(Number(sol[0])), math.round(Number(sol[1]))));
        }
      }
    }

    this.validateRestrictions();

  }

  validateRestrictions() {
    this.interestPoints.forEach((p) => {

      p.z = this.zFunction(p.x, p.y);

      p.valid = true;

      this.restrictions.forEach((r, i) => {

        let restrictionValue = this.restrictionExpressions[i](p.x, p.y);

        console.log(p.x, p.y, restrictionValue, r.eq, r.b);

        switch (String(r.eq)) {
          case '-1':
            if (Number(restrictionValue) > Number(r.b)) {
              p.valid = false;
            }
            break;
          case '0':
            if (Number(restrictionValue) != Number(r.b)) {
              p.valid = false;
            }
            break;
          case '1':
            if (Number(restrictionValue) < Number(r.b)) {
              p.valid = false;
            }
            break;
        }
      });


    })

  }

  generateFunctions() {

    // essa função gera os elementos do array restrictionFunctions, i.e., as funções de igualdade de cada restrição
    const parser = math.parser();

    parser.evaluate('f(x1, x2) = ' + this.z?.a1 + '*x1 + ' + this.z?.a2 + '*x2');

    this.zFunction = parser.get('f');

    this.restrictions.forEach((r, i) => {
      parser.evaluate('f' + i + '(x) = ' + r.b / r.a2 + '-' + r.a1 / r.a2 + '*x');
      parser.evaluate('e' + i + '(x1, x2) = ' + r.a1 + '*x1 + ' + r.a2 + '*x2');
      this.restrictionFunctions.push(parser.get('f' + i));
      this.restrictionExpressions.push(parser.get('e' + i));
    });
  }

  optimizeGraph() {

    let smallestValue = 1e+09, greatestValue = 0;
    let smallestPoint: Point, greatestPoint: Point;

    this.interestPoints.forEach((p, i) => {

      if (p.valid) {
        if (p.z! >= greatestValue) {
          greatestValue = p.z!;
          greatestPoint = this.interestPoints[i];
        }

        if (p.z! <= smallestValue) {
          smallestValue = p.z!;
          smallestPoint = this.interestPoints[i];
        }
      }
    });

    if (this.optimization == 1 && greatestPoint! != undefined) {
      if (greatestPoint!.valid) {
        this.solution = greatestPoint!;
      }
    }

    if (this.optimization == 0 && smallestPoint! != undefined) {
      if (smallestPoint!.valid) {
        this.solution = smallestPoint!;
      }
    }

    console.log(this.solution);

  }

  setGraph() {

    // essa função faz o gráfico das funções e pontos

    this.interestPoints = [];
    this.restrictionFunctions = [];
    this.restrictionExpressions = [];
    this.solution = undefined;
    this.zFunction = null;
    this.z!.a1 = this.form.get('a1')?.value;
    this.z!.a2 = this.form.get('a2')?.value;
    this.optimization = this.form.get('optimization')?.value;

    this.generateFunctions();
    let functionTraces: Array<Trace> = [];
    let pointTraces: Array<Trace> = [];

    this.restrictionFunctions.forEach((f, i) => {
      let r: Restriction = this.restrictions[i];
      let x1 = r.b / r.a1;

      functionTraces.push({
        x: [0, 1, x1],
        y: [f(0), f(1), f(x1)],
        name: 'function',
        mode: 'lines',
        type: 'scatter'
      });

      this.interestPoints.push(new Point(0, f(0)));
      this.interestPoints.push(new Point(x1, f(x1)));
    });

    this.findInterestPoints();
    this.optimizeGraph();


    this.interestPoints.forEach((p) => {
      pointTraces.push({
        x: [p.x],
        y: [p.y],
        name: 'intersection',
        mode: 'markers',
        type: 'scatter'
      });
    })


    this.generateGraph(functionTraces.concat(pointTraces));
  }

  generateGraph(traces: Array<Trace>) {

    // essa função plota o gráfico
    Plotly.purge('plot', traces);
    Plotly.newPlot('plot', traces);
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

class Point {
  x: number;
  y: number;
  z: number | undefined;
  valid: boolean | undefined;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Trace {
  x: number[];
  y: number[];
  name: String;
  mode: String;
  type: String;

  constructor(x: number[], y: number[], name: String, mode: String, type: String) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.mode = mode;
    this.type = type;
  }

}