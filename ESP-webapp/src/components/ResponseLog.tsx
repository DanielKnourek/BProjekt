import React, { useContext } from "react";
import { LogContext } from "@lib/Logger";

// interface ILogger {
//     setLogging?: Dispatch<string>
// }
// let Logger: ILogger

const ResponseLog: React.FC = () => {
  // const [Log, setLog] = useState<String>("No entries yet");
  // Logger.setLogging = setLog;
  const Logger = useContext(LogContext);
  let count = 0;
  const addLog = (logString: string) => {
    Logger?.set(`${Logger?.get} ${count}: ${logString}\n`);
    count++;
    if (count == 100) {
      addLog("100!");
    }
  };
  return (
    <div className="h-full rounded-xl bg-gray-400 p-2 text-sm text-white">
      <p className="underline">Log of responses for current session:</p>
      <div className="overflow-y-scroll">{Logger?.get}</div>
    </div>
  );
};

export default ResponseLog;
