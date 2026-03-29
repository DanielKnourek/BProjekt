import React from "react";
import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import LedControl from "./LedControl";
import ResponseLog from "./ResponseLog";

const ControlPanel: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="ml-16 pl-2">
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
      <LedControl />
      <ResponseLog />
    </>
  );
};

export default ControlPanel;
