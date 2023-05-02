import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Sidebar from "./components/Sidebar";
import LedControl from "./components/LedControl";

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="flex content-center bg-slate-500">
        <Sidebar />
        <div>
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        <div>
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p className="">
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className=" ">Click on the Vite and React logos to learn more</p>
      <LedControl/>
      </div>
    </>
  );
}

export default App;
