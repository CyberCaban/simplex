import Fraction from "fraction.js";
import { BasisExpressions } from "./BasisExpressions";
import { LPTask } from "./types";
import { gaussWithBasis } from "./Gauss";
import { createBeautifulTable, substituteFn } from "./utils";

type SimplexBranch = "Success" | "No limit" | "Intermediate Step"
type PivotElement = { row: number, col: number, ratio: Fraction };
export class SimplexTable {
  substitutedFn: Fraction[]
  basisExpressions: BasisExpressions
  basis: number[]
  table: Fraction[][]
  constructor(lpTask: LPTask) {
    const { constraints, basis, fn } = lpTask
    const gaussSolved = gaussWithBasis(constraints, basis)
    this.basis = basis
    this.basisExpressions = new BasisExpressions(gaussSolved, basis)
    this.substitutedFn = substituteFn(this.basisExpressions, basis, fn)
    this.table = this.initTable()
  }
  private initTable(): Fraction[][] {
    const table: Fraction[][] = []
    this.basisExpressions.solvedGauss.forEach(it => {
      const tableRow = it.map((num, idx) => {
        if (!this.basis.includes(idx)) return num; else return new Fraction(0)
      })
      table.push(tableRow)
    });
    const lastRow = this.substitutedFn.slice()
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
    console.table(this.toString())
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
    const { row: pivotRow, col: pivotCol } = this.findBestPivot()
    const [rows, cols] = this.size
    const newTable: Fraction[][] = Array(rows).fill(null).map(() => Array(cols).fill(new Fraction(0)))

    const invertedPivot = this.table[pivotRow][pivotCol].inverse()
    const newBasis = this.basis.slice()
    newBasis[pivotRow] = pivotCol

    const swapCol = this.basis[pivotRow]
    // invert pivot
    newTable[pivotRow][swapCol] = invertedPivot
    // pivot row
    for (let i = 0; i < cols; i++) {
      if (i != pivotCol && i != swapCol) // do not touch pivot
        newTable[pivotRow][i] = (invertedPivot.mul(this.table[pivotRow][i]))
    }
    // pivot col
    for (let i = 0; i < rows; i++) {
      if (i !== pivotRow)
        newTable[i][swapCol] = invertedPivot.neg().mul(this.table[i][pivotCol])
    }
    // calculate other rows
    for (let i = 0; i < rows; i++) {
      if (i === pivotRow) continue
      for (let j = 0; j < cols; j++) {
        if (j === swapCol || j === pivotCol) continue
        newTable[i][j] = this.table[i][j].add(
          this.table[i][pivotCol]
            .neg()
            .mul(newTable[pivotRow][j])
        )
      }
    }
    this.basis = newBasis
    this.table = newTable
  }
  findBestPivot(): PivotElement {
    const fn = this.fn
    const possiblePivots: PivotElement[] = []
    for (let col = 0; col < this.table[0].length - 1; col++) {
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
    const basises = new Array(this.size[1]).fill("").map((_, idx) =>{
      if (idx === this.size[1]-1) return "beta"
      return this.basis.includes(idx) ? `x_${idx+1}*` : `x_${idx+1}`;
    })
    return `Table:\n${createBeautifulTable(this.table, basises)}`
  }
}
