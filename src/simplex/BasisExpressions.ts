import Fraction from "fraction.js";
import { Matrix } from "./types";

export type Expression = { param: number, expression: Fraction[] };
export class BasisExpressions {
  // expressed basis params
  expressions: Expression[]
  // gauss solved constraints
  solvedGauss: Matrix
  constructor(matrix: Matrix, basis: number[]) {
    this.solvedGauss = matrix
    this.expressions = this.makeExpressions(matrix, basis)
  }
  length() {
    return this.expressions.length
  }
  get(index: number) {
    return this.expressions[index]
  }
  exprToString(): string {
    return `Expressions:\n${this.expressions.map(i => `${i.param}:${i.expression.map(t => t.toFraction()).join(" ")}`).join('\n')}`
  }
  private makeExpressions(matrix: Matrix, basis: number[]): Expression[] {
    const result: Expression[] = []
    const rows = matrix.length;
    const cols = matrix[0].length - 1;
    const constantCol = cols;

    for (let b = 0; b < basis.length; b++) {
      const basisParam = basis[b]
      let expression: Fraction[] = new Array(cols + 1).fill(null).map(()=>new Fraction(0)) // +1 для константы

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
          expression[j] = matrix[foundRow][j].div(coeff).neg();
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
}
