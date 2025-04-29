import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import * as math from 'mathjs';
import SimpleSimplex from 'simple-simplex';
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
  graphSolution: Point | undefined;
  mathSolution: any;


  // essa variável define se mostra o método gráfico na tela

  isUsingGraphMethod = false;
  isUsingMathMethod = false;

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
        this.graphSolution = greatestPoint!;
      }
    }

    if (this.optimization == 0 && smallestPoint! != undefined) {
      if (smallestPoint!.valid) {
        this.graphSolution = smallestPoint!;
      }
    }

  }

  setGraph() {

    // essa função faz o gráfico das funções e pontos

    if (this.isUsingGraphMethod) {
      this.isUsingGraphMethod = false;
      this.removeGraph();
      this.mathSolution = undefined;
      return;
    } else {
      this.isUsingGraphMethod = true;
      this.isUsingMathMethod = false; // <-- ADICIONA ESSA LINHA

    }

    this.mathSolution = false; // <-- Aqui também limpa quando entra no modo gráfico

    this.interestPoints = [];
    this.restrictionFunctions = [];
    this.restrictionExpressions = [];
    this.graphSolution = undefined;
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

  setMath() {
    this.removeGraph();
    this.isUsingMathMethod = false;

    const a1 = this.form.get('a1')?.value;
    const a2 = this.form.get('a2')?.value;
    this.optimization = this.form.get('optimization')?.value;

    if (a1 === undefined || a2 === undefined) {
      console.error("Coeficientes a1 e a2 não podem ser indefinidos.");
      return;
    }

    if (this.restrictions.some(r => r.a1 === undefined || r.a2 === undefined || r.b === undefined)) {
      console.error("Existem restrições incompletas.");
      return;
    }

    console.log('Restrições recebidas:', this.restrictions);

    const constraints = this.restrictions.map(r => ({
      a: r.a1 ?? 0,
      b: r.a2 ?? 0,
      eq: r.eq, 
      c: r.b,
    }));

    const optimizationType = this.optimization === 1 ? 'max' : 'min';
    console.log('Objective:', { a: a1, b: a2 });
    console.log('Constraints:', constraints);

    const tol = 1e-6;

    if (optimizationType === 'max') {
      const candidates: { x: number, y: number }[] = [];

      for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
          const c1 = constraints[i];
          const c2 = constraints[j];
          const det = c1.a * c2.b - c2.a * c1.b;
          if (Math.abs(det) > tol) {
            const x = (c1.c * c2.b - c2.c * c1.b) / det;
            const y = (c1.a * c2.c - c2.a * c1.c) / det;
            if (isFinite(x) && isFinite(y)) {
              candidates.push({ x, y });
            }
          }
        }
      }

      constraints.forEach(c => {
        if (c.a !== 0) {
          const x = c.c / c.a;
          if (isFinite(x)) candidates.push({ x, y: 0 });
        }
        if (c.b !== 0) {
          const y = c.c / c.b;
          if (isFinite(y)) candidates.push({ x: 0, y });
        }
      });

      console.log("Candidatos inicias:", candidates);

      const feasible = candidates
        .filter((p, index, self) => {
          return index === self.findIndex(q =>
            Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6
          );
        })
        .filter(p => {
          console.log(`Verificando ponto (${p.x}, ${p.y})`);

          let satisfiesAll = true;
          for (const c of constraints) {
            const lhs = c.a * p.x + c.b * p.y;

            if (Number(c.eq) === 1 && lhs < c.c - 1e-6) { // >=
              satisfiesAll = false;
              break;
            }
            if (Number(c.eq) === 0 && Math.abs(lhs - c.c) > 1e-6) { // =
              satisfiesAll = false;
              break;
            }
            if (Number(c.eq) === -1 && lhs > c.c + 1e-6) { // <=
              satisfiesAll = false;
              break;
            }
          }

          if (!satisfiesAll) {
            console.log(`Ponto descartado: (${p.x}, ${p.y}) não atende a todas as restricoes`);
          } else {
            console.log(`Ponto aceito: (${p.x}, ${p.y}) atende todas as restrices.`);
          }

          return satisfiesAll && p.x >= -1e-6 && p.y >= -1e-6;
        });

      let bestPoint = feasible[0];
      let bestValue = a1 * bestPoint.x + a2 * bestPoint.y;

      for (const p of feasible) {
        const value = a1 * p.x + a2 * p.y;
        if (value > bestValue) { 
          bestPoint = p;
          bestValue = value;
        }
      }

      console.log("Solução de Maximização:", bestPoint, "Valor:", bestValue);

      this.isUsingMathMethod = true;
      this.isUsingGraphMethod = false;
      this.mathSolution = {
        x: bestPoint.x,
        y: bestPoint.y,
        z: bestValue,
      };


    } else {
      const candidates: { x: number, y: number }[] = [];

      for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
          const c1 = constraints[i];
          const c2 = constraints[j];
          const det = c1.a * c2.b - c2.a * c1.b;
          if (Math.abs(det) > tol) {
            const x = (c1.c * c2.b - c2.c * c1.b) / det;
            const y = (c1.a * c2.c - c2.a * c1.c) / det;
            if (isFinite(x) && isFinite(y)) {
              candidates.push({ x, y });
            }
          }
        }
      }

      constraints.forEach(c => {
        if (c.a !== 0) {
          const x = c.c / c.a;
          if (isFinite(x)) candidates.push({ x, y: 0 });
        }
        if (c.b !== 0) {
          const y = c.c / c.b;
          if (isFinite(y)) candidates.push({ x: 0, y });
        }
      });

      console.log("Candidatos inicias:", candidates);

      const feasible = candidates
        .filter((p, index, self) => {
          return index === self.findIndex(q =>
            Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6
          );
        })
        .filter(p => {
          console.log(`verificando ponto (${p.x}, ${p.y})`);

          let satisfiesAll = true;
          for (const c of constraints) {
            const lhs = c.a * p.x + c.b * p.y;

            if (Number(c.eq) === 1 && lhs < c.c - 1e-6) { 
              satisfiesAll = false;
              break;
            }
            if (Number(c.eq) === 0 && Math.abs(lhs - c.c) > 1e-6) { 
              satisfiesAll = false;
              break;
            }
            if (Number(c.eq) === -1 && lhs > c.c + 1e-6) { 
              satisfiesAll = false;
              break;
            }

          }

          if (!satisfiesAll) {
            console.log(`Ponto descartado: (${p.x}, ${p.y}) não atende a todas as restrições.`);
          } else {
            console.log(`Ponto aceito: (${p.x}, ${p.y}) atende todas as restrições.`);
          }

          return satisfiesAll && p.x >= -1e-6 && p.y >= -1e-6;
        });

      let bestPoint = feasible[0];
      let bestValue = a1 * bestPoint.x + a2 * bestPoint.y;

      for (const p of feasible) {
        const value = a1 * p.x + a2 * p.y;
        if (value < bestValue) {
          bestPoint = p;
          bestValue = value;
        }
      }

      console.log("Solução de Minimização:", bestPoint, "Valor:", bestValue);

      this.isUsingMathMethod = true;
      this.isUsingGraphMethod = false;
      this.mathSolution = {
        x: bestPoint.x,
        y: bestPoint.y,
        z: bestValue,
      };
    }
  }

  generateGraph(traces: Array<Trace>) {

    // essa função plota o gráfico

    Plotly.purge('plot', traces);
    Plotly.newPlot('plot', traces);
  }

  removeGraph() {

    // essa função remove o gráfico

    Plotly.purge('plot');
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
    this.valid = true;
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