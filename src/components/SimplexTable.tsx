import Fraction from "fraction.js";

type SimplexTableProps = {
  table: Fraction[][];
  basis: number[];
  possiblePivots: { row: number; col: number; ratio: Fraction }[];
  selectedPivot?: { row: number; col: number };
  isComplete: boolean;
  isAutoMode: boolean;
  onPivotClick?: (row: number, col: number) => void;
};

export function SimplexTable({
  table,
  basis,
  possiblePivots,
  selectedPivot,
  isComplete,
  isAutoMode,
  onPivotClick,
}: SimplexTableProps) {
  if (table.length === 0) return null;

  const [rows, cols] = [table.length, table[0].length];
  const nonBasisCols = Array.from({ length: cols - 1 }, (_, i) => i).filter(
    (i) => !basis.includes(i)
  );

  const cellStyle: React.CSSProperties = {
    border: "1px solid #555",
    padding: "0.5rem",
    textAlign: "center",
    minWidth: "4rem",
  };

  return (
    <div style={{ overflowX: "auto", marginTop: "1rem" }}>
      <table
        style={{
          borderCollapse: "collapse",
          margin: "0 auto",
          backgroundColor: "rgba(29, 29, 29, 0.8)",
        }}
      >
        <thead>
          <tr>
            <th style={cellStyle}>Базис</th>
            {nonBasisCols.map((col) => (
              <th key={col} style={cellStyle}>
                x<sub>{col + 1}</sub>
              </th>
            ))}
            <th style={cellStyle}>β</th>
          </tr>
        </thead>
        <tbody>
          {basis.map((basisVar, rowIndex) => {
            if (rowIndex >= rows - 1) return null;
            return (
              <tr key={rowIndex}>
                <td style={cellStyle}>
                  x<sub>{basisVar + 1}</sub>
                </td>
                {nonBasisCols.map((col) => {
                  const isPivot =
                    selectedPivot?.row === rowIndex &&
                    selectedPivot?.col === col;
                  const isClickable =
                    !isPivot &&
                    possiblePivots.some(
                      (p) => p.row === rowIndex && p.col === col
                    );
                  return (
                    <td
                      key={col}
                      style={{
                        ...cellStyle,
                        backgroundColor: isPivot
                          ? "rgba(200, 0, 0, 0.3)"
                          : isClickable
                          ? "rgba(100, 150, 255, 0.2)"
                          : undefined,
                        cursor: isClickable ? "pointer" : "default",
                      }}
                      onClick={() =>
                        selectedPivot === undefined &&
                        isClickable &&
                        !isComplete &&
                        onPivotClick?.(rowIndex, col)
                      }
                    >
                      {table[rowIndex][col].toFraction()}
                    </td>
                  );
                })}
                <td style={cellStyle}>
                  {table[rowIndex][cols - 1].toFraction()}
                </td>
              </tr>
            );
          })}
          <tr>
            <td style={cellStyle}>f(x)</td>
            {nonBasisCols.map((col) => (
              <td key={col} style={cellStyle}>
                {table[rows - 1][col].toFraction()}
              </td>
            ))}
            <td style={cellStyle}>{table[rows - 1][cols - 1].toFraction()}</td>
          </tr>
        </tbody>
      </table>
      {possiblePivots.length > 0 && !isComplete && isAutoMode && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.9rem",
            fontStyle: "italic",
          }}
        >
          Кликните на подсвеченную ячейку для выбора опорного элемента
        </div>
      )}
    </div>
  );
}
