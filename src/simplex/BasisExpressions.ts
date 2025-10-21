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
    const cols = matrix[0].length - 1; // -1 потому что последний столбец - свободные члены
    const constantCol = cols; // индекс столбца со свободными членами

    for (let b = 0; b < basis.length; b++) {
      const basisParam = basis[b]
      let expression: Fraction[] = new Array(cols).fill(new Fraction(0))
      for (let i = 0; i < rows; i++) {
        if (!matrix[i][basisParam].equals(0)) {
          const coeff = matrix[i][basisParam]

          for (let j = 0; j < cols; j++) {
            if (j !== basisParam) {
              expression[i] = (matrix[i][j].div(coeff)).neg()
            }
          }
          // add constant
          expression[constantCol] = (matrix[i][constantCol].div(coeff))
          break
        }
      }
      result.push({
        param: basisParam,
        expression
      })
    }
    return result
  }
}
