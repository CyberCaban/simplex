import { useEffect, useState } from "react";
import "./App.css";
import { main } from "./simplex/utils";
import TopBarImg from "./assets/topbar_2.png"
import Fraction from "fraction.js";
import { Matrix } from "./simplex/types";

function App() {
  const [error, setError] = useState("");
  const [isArtificialBasis, setIsArtificialBasis] = useState(false);
  const [problemSize, setProblemSize] = useState(2);
  const [constraintsSize, setConstraintsSize] = useState(2);

  const [fnCoeffs, setFnCoeffs] = useState<Fraction[]>([]);
  const [constraints, setConstraints] = useState<Matrix>([]);

  useEffect(() => {
    // main()
  }, [main])

  const handleChangeProblemSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.min && e.target.max && (e.target.valueAsNumber < +e.target.min || e.target.valueAsNumber > +e.target.max)) return
    setProblemSize(e.target.valueAsNumber)
  }
  const handleChangeConstraintsSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.min && e.target.max && (e.target.valueAsNumber < +e.target.min || e.target.valueAsNumber > +e.target.max)) return
    setConstraintsSize(e.target.valueAsNumber)
  }

  const handleChangeFunction = (e: React.FormEvent<HTMLFormElement>) => {
    try {
      const nums = []
      for (let i = 0; i < problemSize; i++) {
        nums.push(new Fraction(e.target.form[i].value))
      }
      setFnCoeffs(nums)
      console.log(nums);
    } catch (e) {
      console.error("Неверное выражение")
    }
  }

  const handleChangeConstraints = (e: React.FormEvent<HTMLFormElement>) => {
    try {
      const nums = []
      for (let i = 0; i < constraintsSize; i++) {
        nums.push(new Fraction(e.target.form[i].value))
      }
      setConstraints(nums)
      console.log(nums);
    } catch (e) {
      console.error("Неверное выражение")
    }
  }

  return (
    <main className="container">
      <div className="topbar">
        <img src={TopBarImg} alt="" loading="lazy" />
      </div>
      <div className="size-input">
        <label htmlFor="problem-size">Количество переменных: </label>
        <input
          value={problemSize}
          onChange={handleChangeProblemSize}
          type="number"
          id="problem-size"
          name="problem-size"
          min="2"
          max="16"
          defaultValue="2"
        />

        <label htmlFor="constraints-size">Количество ограничений: </label>
        <input
          value={constraintsSize}
          onChange={handleChangeConstraintsSize}
          type="number"
          id="constraints-size"
          name="constraints-size"
          min="2"
          max="16"
          defaultValue="2"
        />
      </div>
      <hr />
      <form className="function-input" onChange={handleChangeFunction}>
        <label htmlFor="function">f(x): </label>
        {Array(problemSize)
          .fill(0)
          .map((_, idx) => (
            <>
              <input
                key={idx}
                type="string"
                id={`x${idx + 1}`}
                name={`x${idx + 1}`}
                defaultValue={1}
              />
              <span> x{idx + 1}</span>
            </>
          ))
          .reduce((prev, curr) => [prev, <span> + </span>, curr])}
        <span> = </span>
        <input
          type="string"
          id="free-coeff"
          name="free-coeff"
          defaultValue={0}
        />
      </form>
      <form className="constraints-input" onChange={handleChangeConstraints}>
        <label htmlFor="constraints">Ограничения: </label>
        <br />
        {Array(constraintsSize)
          .fill(0)
          .map((row, i) => {
            return (
              <>
                {Array(problemSize)
                  .fill(0)
                  .map((_, idx) => (
                    <>
                      <input
                        key={idx}
                        type="string"
                        id={`x${idx + 1}`}
                        name={`x${idx + 1}`}
                        defaultValue={1}
                      />
                      <span> x{idx + 1}</span>
                    </>
                  ))
                  .reduce((prev, curr) => [prev, <span> + </span>, curr])}
                <span> = </span>
                <input
                  type="string"
                  id="free-coeff"
                  name="free-coeff"
                  defaultValue={0}
                />
                <br />
              </>
            );
          })}
      </form>

      <div>
        <label htmlFor="isArtificialBasis">Искусственный базис: </label>
        <input
          onChange={(e) => setIsArtificialBasis(e.target.checked)}
          checked={isArtificialBasis}
          type="checkbox"
          name="isArtificialBasis"
          id="isArtificialBasis"
        />
      </div>

      <form className="basis-input">
        <label htmlFor="basis">Базис: </label>
        {
          Array(problemSize).fill(0).map((_, idx) => (
            <>
              <input
                key={idx}
                type="checkbox"
                id={`basis-x${idx + 1}`}
                name={`x${idx + 1}`}
                defaultValue={1}
              />
              <label htmlFor={`basis-x${idx + 1}`} className="basis-x"> x{idx + 1}</label>
            </>
          ))
        }
      </form>
    </main>
  );
}

export default App;
