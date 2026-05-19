import React, { Dispatch, SetStateAction } from "react";

export interface Logger {
  get: Array<string>;
  set: Dispatch<SetStateAction<Array<string>>>;
}
const LogContext = React.createContext<Logger | null>(null);

const addLog = (Logger: Logger, logString: string) => {
  Logger?.set((prevLogs) => [...prevLogs, `${prevLogs.length}: ${logString}\n`]);
};
// const initLogger = (): Logger => {
//   const [Logs, setLogs] = useState("");

//   return { get: Logs, set: setLogs };
// };

// export { initLogger };

export { LogContext, addLog };
