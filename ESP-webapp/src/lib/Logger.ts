import React, { Dispatch } from "react";

export interface Logger {
  get: string;
  set: Dispatch<string>;
}
export const LogContext = React.createContext<Logger | null>(null);

// const initLogger = (): Logger => {
//   const [Logs, setLogs] = useState("");

//   return { get: Logs, set: setLogs };
// };

// export { initLogger };