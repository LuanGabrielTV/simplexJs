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
  restrictions: Array<Restriction> = [];
  restrictionFunctions: Array<any> = [];
  interestPoints: Array<{ x: number, y: number }> = [];

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

    // essa função é executada na inicialização da página

    this.addRestriction();
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
          this.interestPoints.push({ x: Number(sol[0]), y: Number(sol[1]) });
        }
        console.log(sol);

      }
    }
    this.generateGraph(traces);

  }

  generateFunctions() {

    // essa função gera os elementos do array restrictionFunctions, i.e., as funções de igualdade de cada restrição

    this.restrictionFunctions = [];
    const parser = math.parser();
    this.restrictions.forEach((r, i) => {
      parser.evaluate('f' + i + '(x) = ' + r.b / r.a2 + '-' + r.a1 / r.a2 + '*x');
      this.restrictionFunctions.push(parser.get('f' + i));
    });
  }

  setGraph() {

    // essa função faz o gráfico das funções e pontos

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

      this.interestPoints.push({ x: 0, y: f(0) });
      this.interestPoints.push({ x: x1, y: f(x1) });
    });

    this.findInterestPoints();

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