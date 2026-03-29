import React, { useContext } from "react";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";
const LedControl: React.FC = () => {
  const Logger = useContext(LogContext);
  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
  };
  return (
    <div className="items-center p-2">
      <form onSubmit={submitAction}>
        <button
          className="m-1 w-full rounded-sm bg-green-600 p-1 text-white focus:bg-green-800"
          type="submit"
          name="led-on"
          onClick={() => {
            fetch(`${getAPIuri(ENV)}led?LED1=1`)
              .then((res) => res.text())
              .then(
                (json) => Logger && addLog(Logger, `${json}=1`)
              );
          }}
        >
          LED set on
        </button>
        <button
          className="m-1 w-full rounded-sm bg-red-600 p-1  text-white focus:bg-red-800"
          type="submit"
          name="led-on"
          onClick={() => {
            fetch(`${getAPIuri(ENV)}led?LED1=0`)
              .then((res) => res.text())
              .then((json) => Logger && addLog(Logger, `${json}=0`));
          }}
        >
          LED set off
        </button>
      </form>
    </div>
  );
};

export default LedControl;
