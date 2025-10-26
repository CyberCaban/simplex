import Fraction from "fraction.js";
import { LPTask, Matrix } from "./types";
import { gaussWithBasis } from "./Gauss";
import { createBeautifulTable, substituteFn } from "./utils";

type SimplexBranch = "Success" | "No limit" | "Intermediate Step"
type PivotElement = { row: number, col: number, ratio: Fraction };
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
  private initTable(gaussSolved: Matrix, basis: number[], fn: Fraction[]): Fraction[][] {
    const substitutedFn = substituteFn(gaussSolved, basis, fn)
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
  simplexStep() {
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
        this.simplexStep()
        break
      default:
        break;
    }
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
