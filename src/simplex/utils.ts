import Fraction from "fraction.js";

// @ts-ignore
Fraction.prototype.toString = Fraction.prototype.toFraction
function createBeautifulTable(matrix: Fraction[][], headers: string[] | null = null) {
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

type Matrix = Fraction[][];

function gaussWithBasis(matrix: Matrix, basis: number[]): Matrix {
  const result = matrix.map(row => [...row]);
  const rows = result.length;
  const cols = result[0].length

  if (!basis.every((it) => it < cols)) {
    throw new Error('Размер базиса должен совпадать с количеством уравнений');
  }

  // Gauss forward
  for (let i = 0; i < rows; i++) {
    const pivotCol = basis[i].valueOf();

    // Находим строку с ненулевым элементом в столбце базиса
    let pivotRow = i;
    for (let j = i; j < rows; j++) {
      if (result[j][pivotCol].abs() > new Fraction(1e-10)) {
        pivotRow = j;
        break;
      }
    }

    // singular system
    if (result[pivotRow][pivotCol].abs() < new Fraction(1e-10)) {
      throw new Error('Система вырождена для данного базиса');
    }

    // swap
    if (pivotRow !== i) {
      [result[i], result[pivotRow]] = [result[pivotRow], result[i]];
    }

    // Normalise
    const pivotValue = result[i][pivotCol];
    for (let j = 0; j < cols.valueOf(); j++) {
      result[i][j] = result[i][j].div(pivotValue);
    }

    // Zeroing other cols
    for (let j = 0; j < rows; j++) {
      if (j !== i) {
        const factor = result[j][pivotCol];
        for (let k = 0; k < cols; k++) {
          const zeroingEl = factor.mul(result[i][k])
          result[j][k] = result[j][k].add(-zeroingEl)
        }
      }
    }
  }

  return result;
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
type Expression = { param: number, expression: Fraction[] };
class BasisExpressions {
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
  private makeExpressions(matrix: Matrix, basis: number[]): Expression[] {
    const result = []
    const rows = matrix.length;
    const cols = matrix[0].length - 1; // -1 потому что последний столбец - свободные члены
    const constantCol = cols; // индекс столбца со свободными членами
    for (let b = 0; b < basis.length; b++) {
      const el = basis[b]
      const expression: Fraction[] = []
      for (let i = 0; i < rows; i++) {
        // if basis element
        if (matrix[i][el].equals(1)) {
          for (let j = 0; j < cols; j++) {
            if (j !== el) {
              // math checks
              const elementToSwap = matrix[i][j]
              expression.push(elementToSwap.neg())
            }
          }
          // add constant
          expression.push(matrix[i][constantCol])
        }
      }
      result.push({
        param: el,
        expression
      })
    }
    return result
  }
}
type SimplexBranch = "Success" | "No limit" | "Intermediate Step"
type PivotElement = { row: number, col: number, ratio: Fraction };
class SimplexTable {
  substitutedFn: Fraction[]
  basisExpressions: BasisExpressions
  basis: number[]
  table: Fraction[][]
  constructor(basisExpressions: BasisExpressions, basis: number[], fn: Fraction[]) {
    this.basis = basis
    this.substitutedFn = substituteFn(basisExpressions, basis, fn)
    this.basisExpressions = basisExpressions
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
    const branch = this.chooseBranch()
    switch (branch) {
      case "Success":
        const [rows, cols] = this.size
        return this.table[rows - 1][cols - 1].neg()

      case "No limit":
        throw Error("Function has no lower bound")
      case "Intermediate Step":
        this.calculateStep()
        this.simplexStep()
        break
      default:
        break;
    }
  }
  calculateStep() {
    // TODO: simplex method
    const { row: pivotRow, col: pivotCol, ratio } = this.findBestPivot()
    const [rows, cols] = this.size
    const newTable: Fraction[][] = Array(rows).fill(null).map(() => Array(cols).fill(new Fraction(0)))

    const invertedPivot = this.table[pivotRow][pivotCol].inverse()
    const newBasis = this.basis.slice()
    newBasis[pivotRow] = pivotCol
    console.log("old basis:", this.basis, "new basis:", newBasis);

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
    const constraints = this.constraints
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
    for (let i = 0; i < possiblePivots.length; i++) {
      if (bestPivot.ratio > possiblePivots[i].ratio) bestPivot = possiblePivots[i]
    }
    console.log("Best Pivot: ", "row:", bestPivot.row, "col:", bestPivot.col, "ratio:", bestPivot.ratio.toFraction());
    return bestPivot
  }
  chooseBranch(): SimplexBranch {
    const fn = this.fn
    const constraints = this.constraints
    if (fn.every(it => it.gte(0))) return "Success"
    for (let col = 0; col < fn.length; col++) {
      if (fn[col].lt(0)) continue
      else {
        if (constraints.every(it => it[col].lt(0))) return "No limit"
      }
    }
    return "Intermediate Step"
  }
  toString(): string {
    const basises = new Array(this.size[1]).fill("").map((_, idx) => this.basis.includes(idx) ? `x_${idx}*` : `x_${idx}`)
    return `Table:\n${createBeautifulTable(this.table, basises)}`
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
function substituteFn(basisExpressions: BasisExpressions, basis: number[], fn: Fraction[]): Fraction[] {
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
  const dimension = 4;
  // target fn
  // last element is param free
  const fn = [-2, -1, -3, -1, 0].map(it => new Fraction(it)); // -> min
  const constraints = [
    [1, 2, 5, -1, 4],
    [1, -1, -1, 2, 1]
  ].map(row => row.map(el => new Fraction(el)))
  const basis = [2, 3] // actual basis = [3, 4]
  const [data, error] = tryExpr(() => gaussWithBasis(constraints, basis))
  if (error) {
    console.error('Ошибка:', error.message);
    return
  }
  console.log('Результат:');
  data.forEach(row => console.log(row.map(x => x.toFraction()).join(' ')));

  const basisExpressions = new BasisExpressions(data, basis)
  const table = new SimplexTable(basisExpressions, basis, fn)
  table.simplexStep()
  console.log(table.toString());
}
