import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { main } from "./simplex/utils";
import TopBarImg from "./assets/topbar_2.png"
import Fraction from "fraction.js";

function App() {
  const [error, setError] = useState("");
  const [problemSize, setProblemSize] = useState(2);
  const [constraintsSize, setConstraintsSize] = useState(2);
  
  const [fnCoeffs, setFnCoeffs] = useState<Fraction[]>([]);

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

  return (
    <main className="container">
      <div className="topbar">
        <img src={TopBarImg} alt="" loading="lazy"/>
      </div>
      <div className="size-input">
        <label htmlFor="problem-size">Количество переменных: </label>
        <input value={problemSize} onChange={handleChangeProblemSize} type="number" id="problem-size" name="problem-size" min="2" max="16" defaultValue="2" />

        <label htmlFor="constraints-size">Количество ограничений: </label>
        <input value={constraintsSize} onChange={handleChangeConstraintsSize} type="number" id="constraints-size" name="constraints-size" min="2" max="16" defaultValue="2" />
      </div>
      <hr />
      <form className="function-input" onChange={handleChangeFunction}>
        <label htmlFor="function">f(x): </label>
        {Array(problemSize).fill(0).map((_, idx) => 
        <>
          <input key={idx} type="string" id={`x${idx + 1}`} name={`x${idx + 1}`} />
          <span> x{idx + 1}</span>
        </>
        ).reduce((prev, curr) => [prev, <span> + </span>, curr])}
        <input type="string" id="free-coeff" name="free-coeff" defaultValue="0" />
      </form>
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

    </main>
  );
}

export default App;
