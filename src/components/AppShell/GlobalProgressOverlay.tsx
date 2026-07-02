import { FileText, Loader2, Database, Upload, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function GlobalProgressOverlay() {
  const { activeJobs, removeJob } = useGlobalProgress();
  const { data: notifications = [] } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    activeJobs.forEach((job) => {
      if (job.jobId) {
        const matchingNotification = notifications.find(
          (n) => String(n.background_job_id) === String(job.jobId)
        );
        if (matchingNotification) {
          removeJob(job.id);
          
          // Check if in-app alerts are enabled (defaults to true if not set)
          const alertsEnabled = localStorage.getItem("inAppAlerts") !== "false";
          if (alertsEnabled) {
            toast.success(matchingNotification.title, {
              description: matchingNotification.message || `${job.title} has completed successfully.`
            });
          }
        }
      }
    });
  }, [notifications, activeJobs, removeJob]);

  // Collapse if there are no more active jobs (so it doesn't open empty next time)
  useEffect(() => {
    if (activeJobs.length === 0) {
      setIsExpanded(false);
    }
  }, [activeJobs.length]);

  if (activeJobs.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3 pointer-events-none">
        
        {/* Expanded list of jobs */}
        {isExpanded && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {activeJobs.map((job) => {
              let Icon = FileText;
              if (job.type === "database") Icon = Database;
              else if (job.type === "upload") Icon = Upload;
              else if (job.type === "generic") Icon = Settings;

              return (
                <div key={job.id} className="pointer-events-auto">
                  <div className="bg-background border shadow-xl rounded-xl p-4 flex items-center gap-4 min-w-[300px] max-w-[400px]">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-foreground truncate mr-2">
                          {job.title}
                        </span>
                        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
                      </div>
                      {/* <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden relative shadow-inner">
                        <div 
                          className="bg-primary h-full absolute left-0 top-0 w-1/3 animate-[progress_1s_ease-in-out_infinite]"
                          style={{
                            animationName: "indeterminate",
                            animationDuration: "1.5s",
                            animationIterationCount: "infinite",
                            animationTimingFunction: "ease-in-out",
                          }}
                        />
                      </div> */}
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
                        {job.description || "Processing..."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Trigger */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="pointer-events-auto flex items-center gap-2 bg-background border shadow-xl rounded-full px-4 py-2 hover:bg-accent transition-colors text-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-semibold whitespace-nowrap">
            {activeJobs.length} {activeJobs.length === 1 ? 'task is' : 'tasks are'} running...
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
          )}
        </button>

      </div>
      <style>{`
        @keyframes indeterminate {
          0% { left: -33%; width: 33%; }
          50% { width: 50%; }
          100% { left: 100%; width: 33%; }
        }
      `}</style>
    </>
  );
}
