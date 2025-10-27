import Fraction from "fraction.js";
import { Expression, LPTask, Matrix } from "../types";
import { gaussWithBasis } from "./Gauss";
import { createBeautifulTable } from "./utils";

type SimplexBranch = "Success" | "No limit" | "Intermediate Step"
type PivotElement = { row: number, col: number, ratio: Fraction };
type SimplexTable = {
  stepNumber: number,
  basis: number[],
  matrix: Fraction[][],
  pivot: PivotElement
}
export class SimplexSolver {
  basis: number[]
  table: Fraction[][]
  stepNumber: number
  constructor(lpTask: LPTask) {
    const { constraints, basis, fn, isMaximization } = lpTask
    const func = isMaximization ? fn.map(it => it.neg()) : fn
    const gaussSolved = gaussWithBasis(constraints, basis)
    this.basis = basis
    this.table = this.initTable(gaussSolved, basis, func)
    this.stepNumber = 0
  }
  protected initTable(gaussSolved: Matrix, basis: number[], fn: Fraction[]): Fraction[][] {
    const substitutedFn = this.substituteFn(gaussSolved, basis, fn)
    const table: Fraction[][] = []
    const [rows, cols] = [gaussSolved.length, gaussSolved[0].length]

    for (let i = 0; i < rows; i++) {
      table.push([...gaussSolved[i]])
    }

    const lastRow = substitutedFn
    lastRow[lastRow.length - 1] = lastRow[lastRow.length - 1].neg()
    table.push(lastRow)

    return table
  }
  // [rows, cols]
  get size(): [number, number] {
    return [this.table.length, this.table[0].length]
  }
  get fn(): Fraction[] {
    return this.table[this.size[0] - 1]
  }
  get constraints(): Fraction[][] {
    return this.table.slice(0, this.table.length)
  }
  simplexStep(): Fraction {
    console.table(this.toStringVert())
    const branch = this.chooseBranch()
    switch (branch) {
      case "Success":
        const [rows, cols] = this.size
        return this.table[rows - 1][cols - 1].neg()

      case "No limit":
        throw Error(`Function ${this.fn} has no lower bound`)
      case "Intermediate Step":
        this.calculateStep()
        return this.simplexStep()
      default:
        break;
    }
    throw Error("Something went wrong")
  }
  calculateStep() {
    const bestPivot = this.findBestPivot()
    if (bestPivot === null) throw Error("Опорный элемент не найден")
    const { row: pivotRow, col: pivotCol } = bestPivot
    const [rows, cols] = this.size
    const newTable: Fraction[][] = Array(rows)
      .fill(null)
      .map(() =>
        Array(cols)
          .fill(null)
          .map(() =>
            new Fraction(0)))

    const pivot = this.table[pivotRow][pivotCol]
    this.basis[pivotRow] = pivotCol

    const swapCol = this.basis[pivotRow]

    // invert pivot
    // newTable[pivotRow][swapCol] = invertedPivot
    // pivot row
    for (let i = 0; i < cols; i++) {
      newTable[pivotRow][i] = this.table[pivotRow][i].div(pivot)
    }
    // pivot col
    // for (let i = 0; i < rows; i++) {
    //   if (i !== pivotRow)
    //     newTable[i][swapCol] = invertedPivot.neg().mul(this.table[i][pivotCol])
    // }
    // calculate other rows
    for (let i = 0; i < rows; i++) {
      if (i === pivotRow) continue
      for (let j = 0; j < cols; j++) {
        newTable[i][j] = this.table[i][j].sub(
          this.table[i][pivotCol]
            .mul(newTable[pivotRow][j])
        )
      }
    }
    this.stepNumber++
    this.table = newTable
  }
  findBestPivot(): PivotElement | null {
    const fn = this.fn
    const constraints = this.constraints.slice(0, -1)
    const possiblePivots: PivotElement[] = []

    for (let col = 0; col < fn.length - 1; col++) {
      if (this.basis.includes(col) || fn[col].gte(0)) continue;
      else {
        for (let row = 0; row < this.table.length; row++) {
          const aplha_i = this.table[row][col]
          const beta = this.table[row][this.size[1] - 1]
          if (aplha_i.gt(0)) possiblePivots.push({
            row, col, ratio: beta.div(aplha_i)
          })
        }
      }
    }
    let bestPivot = possiblePivots[0]
    if (bestPivot == null) throw Error("No pivots")
    for (let i = 0; i < possiblePivots.length; i++) {
      if (bestPivot.ratio.gt(possiblePivots[i].ratio)) bestPivot = possiblePivots[i]
    }
    return bestPivot
  }
  chooseBranch(): SimplexBranch {
    const fn = this.fn.slice(0, this.fn.length - 1)
    const constraints = this.constraints
    if (fn.every(it => it.gte(0))) return "Success"
    for (let col = 0; col < fn.length; col++) {
      if (fn[col].lt(0)) {
        if (constraints.every(it => it[col].lte(0))) return "No limit"
      }
    }
    return "Intermediate Step"
  }
  private prepareExpressions(matrix: Matrix, basis: number[]): Expression[] {
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
  private substituteFn(gaussSolved: Matrix, basis: number[], fn: Fraction[]): Fraction[] {
    const basisExpressions = this.prepareExpressions(gaussSolved, basis)
    const matrix = gaussSolved
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
      const basisVar = basisExpressions[i]
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
  toString(): string {
    const basises = new Array(this.size[1]).fill("").map((_, idx) => {
      if (idx === this.size[1] - 1) return "beta"
      return this.basis.includes(idx) ? `x_${idx + 1}*` : `x_${idx + 1}`;
    })
    return `Table:\n${createBeautifulTable(this.table, basises)}`
  }
  toStringVert(): string {
    const basises = []
    const [rows, cols] = this.size
    const headerRow = new Array(cols).fill(null).map((_, idx) => {
      if (idx === cols - 1) return "beta"
      else return `x_${idx + 1}`
    }).filter((_, idx) => !this.basis.includes(idx))
    const header = ["", ...headerRow]
    for (let i = 0; i < this.basis.length; i++) {
      const basiCol = this.basis[i];
      for (let j = 0; j < rows; j++) {
        const el = this.table[j][basiCol]
        if (el.equals(1)) {
          const row = this.table[j].filter((_, idx) => !this.basis.includes(idx))
          basises.push([`x_${basiCol + 1}`, ...row])
          break
        }
      }
    }
    const filteredFn = this.table[rows - 1].filter((_, idx) => !this.basis.includes(idx))
    basises.push(["fn", ...filteredFn])
    // @ts-ignore
    return createBeautifulTable(basises, header)
  }
}


export class ExtendedSimplexSolver extends SimplexSolver {
  // Добавляем метод для получения текущего состояния
  getCurrentState() {
    return {
      basis: this.basis,
      table: this.table,
      stepNumber: this.stepNumber
    };
  }

  // Метод для принудительного установления базиса
  setBasis(newBasis: number[]): void {
    this.basis = newBasis;
    // Пересчитываем таблицу для нового базиса
    const gaussSolved = gaussWithBasis(
      this.table.slice(0, -1).map(row => row.slice(0, -1).concat(row[row.length - 1])),
      newBasis
    );
    this.table = this.initTable(gaussSolved, newBasis, this.fn.slice(0, -1));
  }
}

export function needsArtificialBasis(lpTask: LPTask): boolean {
  const { constraints, basis } = lpTask;

  for (let i = 0; i < basis.length; i++) {
    const betaValue = constraints[i][constraints[i].length - 1];
    if (betaValue.lt(0)) {
      return true;
    }
  }

  try {
    new SimplexSolver(lpTask);
    return false;
  } catch {
    return true;
  }
}
