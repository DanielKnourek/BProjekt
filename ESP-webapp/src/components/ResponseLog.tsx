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

  return (
    <div className="h-full rounded-xl bg-gray-400 p-2 text-sm text-white">
      <p className="underline">Log of responses for current session:</p>
      <div className="h-4/5 overflow-y-scroll mb-8 flex flex-col-reverse">
        {Logger?.get.map((log) => {
          return <p>{log}</p>;
        })}
      </div>
    </div>
  );
};

export default ResponseLog;
