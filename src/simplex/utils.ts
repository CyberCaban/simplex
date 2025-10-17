type Matrix = number[][];

function gaussWithBasis(matrix: Matrix, basis: number[]): Matrix {
  const result = matrix.map(row => [...row]);
  const rows = result.length;
  const cols = result[0].length;

  if (!basis.every((it) => it < cols)) {
    throw new Error('Размер базиса должен совпадать с количеством уравнений');
  }

  // Gauss forward
  for (let i = 0; i < rows; i++) {
    const pivotCol = basis[i];

    // Находим строку с ненулевым элементом в столбце базиса
    let pivotRow = i;
    for (let j = i; j < rows; j++) {
      if (Math.abs(result[j][pivotCol]) > 1e-10) {
        pivotRow = j;
        break;
      }
    }

    // singular system
    if (Math.abs(result[pivotRow][pivotCol]) < 1e-10) {
      throw new Error('Система вырождена для данного базиса');
    }

    // swap
    if (pivotRow !== i) {
      [result[i], result[pivotRow]] = [result[pivotRow], result[i]];
    }

    // Normalise
    const pivotValue = result[i][pivotCol];
    for (let j = 0; j < cols; j++) {
      result[i][j] /= pivotValue;
    }

    // Zeroing other cols
    for (let j = 0; j < rows; j++) {
      if (j !== i) {
        const factor = result[j][pivotCol];
        for (let k = 0; k < cols; k++) {
          result[j][k] -= factor * result[i][k];
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
type Expression = { param: number, expression: number[] };
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
      const expression = []
      for (let i = 0; i < rows; i++) {
        // if basis element
        if (matrix[i][el] === 1) {
          for (let j = 0; j < cols; j++) {
            if (j !== el) {
              // math checks
              const elementToSwap = matrix[i][j]
              if (elementToSwap === 0) expression.push(elementToSwap)
              else
                expression.push(-elementToSwap)
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
class SimplexTable {
  substitutedFn: number[]
  basisExpressions: BasisExpressions
  basis: number[]
  table: number[][]
  constructor(basisExpressions: BasisExpressions, basis: number[], fn: number[]) {
    this.basis = basis
    this.substitutedFn = substituteFn(basisExpressions, basis, fn)
    this.basisExpressions = basisExpressions
    this.table = this.initTable()
  }
  private initTable(): number[][] {
    const table = []
    this.basisExpressions.solvedGauss.forEach(it => {
      const tableRow = it.map((num, idx) => {
        if (!this.basis.includes(idx)) return num; else return 0
      })
      table.push(tableRow)
    });
    table.push(this.substitutedFn)
    return table
  }
  // [rows, cols]
  get size(): [number, number] {
    return [this.table.length, this.table[0].length]
  }
  get fn(): number[] {
    return this.table[this.size[0] - 1]
  }
  get constraints(): number[][] {
    return this.table.slice(0, this.table.length)
  }
  simplexStep() {
    const branch = this.chooseBranch()
    switch (branch) {
      case "Success":
        const [rows, cols] = this.size
        return this.table[rows - 1][cols - 1]

      case "No limit":
        throw Error("Function has no lower bound")
      case "Intermediate Step":
        this.calculateStep()
        // this.simplexStep()
        break
      default:
        break;
    }
  }
  calculateStep() {
    const fn = this.fn
    const constraints = this.constraints
    const ratios: { row: number, col: number, ratio: number }[] = []
    for (let col = 0; col < fn.length - 1; col++) {
      if (this.basis.includes(col) || fn[col] >= 0) continue;
      else {
        for (let row = 0; row < constraints.length; row++) {
          const aplha_i = constraints[row][col]
          const beta = constraints[row][this.size[1] - 1]
          if (aplha_i > 0) ratios.push({
            row, col, ratio: beta / aplha_i
          })
        }
      }
    }
    const bestRatio = ratios.reduce((acc, curr) => {
      if (acc.ratio > curr.ratio) return curr
      else return acc
    }, ratios[0])
    console.log(bestRatio);
    // TODO: simplex method
  }
  chooseBranch(): SimplexBranch {
    const fn = this.fn
    const constraints = this.constraints
    if (fn.every(it => it >= 0)) return "Success"
    for (let col = 0; col < fn.length; col++) {
      if (fn[col] < 0) continue
      else {
        if (constraints.every(it => it[col] < 0)) return "No limit"
      }
    }
    return "Intermediate Step"
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
function substituteFn(basisExpressions: BasisExpressions, basis: number[], fn: number[]): number[] {
  const matrix = basisExpressions.solvedGauss
  const cols = matrix[0].length - 1
  const rows = matrix.length
  const constantCol = cols
  // function substitution
  const substitutedFn = new Array(cols + 1).fill(0)
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
    const multipliedExpr = basisVar.expression.map((it) => it * coeff)

    for (let j = 0; j < cols; j++) {
      if (!basis.includes(j))
        substitutedFn[j] += multipliedExpr[j]
    }
    substitutedFn[constantCol] += coeff * matrix[i][constantCol]
  }
  return substitutedFn
}

export function main() {
  const dimension = 4;
  // target fn
  // last element is param free
  const fn = [-2, -1, -3, -1, 0]; // -> min
  const constraints = [
    [1, 2, 5, -1, 4],
    [1, -1, -1, 2, 1]
  ]
  const basis = [2, 3] // actual basis = [3, 4]
  const [data, error] = tryExpr(() => gaussWithBasis(constraints, basis))
  if (error) {
    console.error('Ошибка:', error.message);
    return
  }
  console.log('Результат:');
  data.forEach(row => console.log(row.map(x => Math.round(x * 100) / 100).join(' ')));

  const basisExpressions = new BasisExpressions(data, basis)
  const table = new SimplexTable(basisExpressions, basis, fn)
  console.log(table);
  console.log(table.simplexStep());


}
