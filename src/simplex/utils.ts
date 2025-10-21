import Fraction from "fraction.js";
import LP from "./lp.json"
import { Matrix, parseTask, Task } from "./types";
import { BasisExpressions } from "./BasisExpressions";
import { SimplexTable } from "./SimplexTable";

// @ts-ignore
Fraction.prototype.toString = Fraction.prototype.toFraction
export function createBeautifulTable(matrix: Fraction[][], headers: string[] | null = null) {
  if (headers) {
    // @ts-ignore
    matrix = [headers, ...matrix];
  }

  const colWidths = matrix[0].map((_, colIndex: number) =>
    Math.max(...matrix.map(row => String(row[colIndex]).length))
  );

  const rows = matrix.map(row =>
    '| ' + row.map((cell, i) =>
      cell.toString().padEnd(colWidths[i])
    ).join(' | ') + ' |'
  );

  if (headers) {
    const separator = '|' + colWidths.map(width =>
      '-'.repeat(width + 2)
    ).join('|') + '|';
    rows.splice(1, 0, separator);
  }

  return rows.join('\n');
}


type Result<T, E = Error> = [T, null] | [null, E];
function tryExpr<T>(fallibleFn: () => T): Result<T, Error> {
  try {
    const result = fallibleFn()
    return [result, null]
  } catch (e) {
    return [null, e] as [null, Error]
  }
}
function expressBasisVariables(matrix: Matrix, basis: number[]): BasisExpressions {
  const basisExpressions = new BasisExpressions(matrix, basis)
  return basisExpressions
}
function addArrays(arr1: number[], arr2: number[]): number[] {
  const result = arr1.slice()
  for (let i = 0; i < arr1.length; i++) {
    result[i] += arr2[i]
  }
  return result
}
export function substituteFn(basisExpressions: BasisExpressions, basis: number[], fn: Fraction[]): Fraction[] {
  const matrix = basisExpressions.solvedGauss
  const cols = matrix[0].length - 1
  const rows = matrix.length
  const constantCol = cols
  // function substitution
  const substitutedFn: Fraction[] = new Array(cols + 1).fill(new Fraction(0))
  // fill from original fn without substituted elements
  for (let i = 0; i < cols; i++) {
    if (!basis.includes(i)) {
      substitutedFn[i] = fn[i]
    }
  }
  // substitute basis elements
  for (let i = 0; i < rows; i++) {
    const basisVar = basisExpressions.get(i)
    const coeff = fn[basisVar.param]
    const multipliedExpr = basisVar.expression.map((it) => it.mul(coeff))

    for (let j = 0; j < cols; j++) {
      if (!basis.includes(j))
        substitutedFn[j] = substitutedFn[j].add(multipliedExpr[j])
    }
    substitutedFn[constantCol] = substitutedFn[constantCol].add(matrix[i][constantCol].mul(coeff))
  }
  return substitutedFn
}

export function main() {
  console.clear()
  const tasks: Task[] = LP as Task[]
  const [results, err] = tryExpr(() => {

    tasks.map((t) => {
      const task = parseTask(t)
      console.log(task);

      const table = new SimplexTable(task)
      // while (table.chooseBranch() == "Intermediate Step") {
      table.simplexStep()
      // }
    })
  })
  if (err !== null) console.error(err)
  else
    console.log("Ran successfully");

}
