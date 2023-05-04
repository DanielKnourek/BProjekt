import React, { Dispatch } from "react";

export interface Logger {
  get: Array<string>;
  set: Dispatch<Array<string>>;
}
const LogContext = React.createContext<Logger | null>(null);

const addLog = (Logger: Logger, logString: string) => {
  Logger?.set([...Logger.get, `${Logger.get.length}: ${logString}\n`]);
};
// const initLogger = (): Logger => {
//   const [Logs, setLogs] = useState("");

//   return { get: Logs, set: setLogs };
// };

// export { initLogger };

export { LogContext, addLog };
