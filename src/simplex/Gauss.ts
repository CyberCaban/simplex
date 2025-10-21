import Fraction from "fraction.js";
import { Matrix } from "./types";

export function gaussWithBasis(matrix: Matrix, basis: number[]): Matrix {
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
