import Fraction from "fraction.js"

export type Matrix = Fraction[][];

export type Task = {
  "fn": number[]
  "constraints": number[][],
  "basis": number[]
}

export type LPTask = {
  "fn": Fraction[]
  "constraints": Fraction[][],
  "basis": number[]
}

export function parseTask(task: Task): LPTask {
  const { fn, constraints, basis } = task
  return {
    "fn": fn.map((it) => new Fraction(it)),
    "constraints": constraints.map(row => row.map(it => new Fraction(it))),
    basis
  }
}
