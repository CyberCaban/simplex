import Fraction from "fraction.js";
import LP from "./lp.json"
import { parseTask, Task } from "./types";
import { ArtificialBasisSolver } from "./ArtificialSolver";

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
      cell.toString().padStart(colWidths[i])
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

export function main() {
  console.clear()
  const tasks: Task[] = LP as Task[]
  const [results, err] = tryExpr(() => {

    tasks.map((t) => {
      const task = parseTask(t)
      console.log(task);

      const table = new ArtificialBasisSolver(task)
      // while (table.chooseBranch() == "Intermediate Step") {
      table.solve()
      table.printSolution()
      // }
    })
  })
  if (err !== null) console.error(err)
  else
    console.log("Ran successfully");

}
