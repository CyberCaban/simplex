import Fraction from "fraction.js"

export type Matrix = Fraction[][];
export type Expression = { param: number, expression: Fraction[] };

export type Task = {
  "task": {
    "fn": number[]
    "constraints": number[][],
    "basis": number[],
    isMaximization: boolean,
  }
}

export type ArtificialBasisResult = {
  solution: Fraction[];
  value: Fraction;
  hasSolution: boolean;
  phase1Value: Fraction;
}

export type Solution = {
  solution: Fraction[];
  value: Fraction;
  hasSolution: boolean;
}

export type LPTask = {
  "fn": Fraction[]
  "constraints": Fraction[][],
  "basis": number[],
  isMaximization: boolean,
}

export function parseTask(task: Task): LPTask {
  const { fn, constraints, basis, isMaximization } = task.task
  return {
    "fn": fn.map((it) => new Fraction(it)),
    "constraints": constraints.map(row => row.map(it => new Fraction(it))),
    basis: basis.slice(),
    isMaximization
  }
}
