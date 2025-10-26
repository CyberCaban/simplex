import Fraction from "fraction.js";
import { Matrix } from "./types";

export type Expression = { param: number, expression: Fraction[] };

export function prepareExpressions(matrix: Matrix, basis: number[]): Expression[] {
  const result: Expression[] = []
  const rows = matrix.length;
  const cols = matrix[0].length - 1;

  for (let b = 0; b < basis.length; b++) {
    const basisParam = basis[b]
    let expression: Fraction[] = new Array(cols + 1).fill(null).map(() => new Fraction(0)) // +1 для константы

    let foundRow = -1;
    for (let i = 0; i < rows; i++) {
      if (!matrix[i][basisParam].equals(0)) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) continue;

    const coeff = matrix[foundRow][basisParam];
    for (let j = 0; j < cols; j++) {
      if (j !== basisParam) {
        expression[j] = matrix[foundRow][j].neg();
      }
    }
    expression[basisParam] = new Fraction(1)

    result.push({
      param: basisParam,
      expression
    })
  }
  return result
}
