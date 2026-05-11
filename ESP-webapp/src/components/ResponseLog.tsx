import React, { useContext, useRef, useEffect } from "react";
import { LogContext } from "@lib/Logger";

// interface ILogger {
//     setLogging?: Dispatch<string>
// }
// let Logger: ILogger

const ResponseLog: React.FC = () => {
  const Logger = useContext(LogContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [Logger?.get]);

  return (
    <div className="flex flex-col h-full font-mono text-xs text-slate-300 bg-slate-900 rounded-xl shadow-inner border border-slate-800 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">System Console</span>
        </div>
        <span className="text-[10px] text-slate-400">{timeStr}</span>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent scroll-smooth"
      >
        {Logger?.get.map((log, i) => (
          <div key={i} className="flex gap-3 py-0.5 border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors group">
            <span className="text-slate-600 shrink-0 select-none">{timeStr}</span>
            <span className="text-emerald-400 select-none mr-1">➜</span>
            <span className="break-all text-slate-200 group-hover:text-white">{log}</span>
          </div>
        ))}
        {Logger?.get.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-600 italic">
            Waiting for system initialization...
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseLog;
