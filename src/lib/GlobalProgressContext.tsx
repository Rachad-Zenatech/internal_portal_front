import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type JobType = "document" | "database" | "upload" | "generic";

type GlobalProgressContextType = {
  activeJobs: { id: string; title: string; jobId?: string; description?: string; type?: JobType; link_url?: string }[];
  addJob: (title: string, promise: Promise<any>, options?: { description?: string; type?: JobType; link_url?: string }) => void;
  removeJob: (id: string) => void;
};

const GlobalProgressContext = createContext<GlobalProgressContextType | undefined>(undefined);

export function GlobalProgressProvider({ children }: { children: ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<{ id: string; title: string; jobId?: string; description?: string; type?: JobType; link_url?: string }[]>(() => {
    try {
      const stored = localStorage.getItem("globalProgressJobs");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out jobs that don't have a jobId yet, because the promise that would set it is gone after refresh.
        return parsed.filter((job: any) => Boolean(job.jobId));
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("globalProgressJobs", JSON.stringify(activeJobs));
  }, [activeJobs]);

  const removeJob = (id: string) => {
    setActiveJobs((prev) => prev.filter((u) => u.id !== id));
  };

  const addJob = (title: string, promise: Promise<any>, options?: { description?: string; type?: JobType; link_url?: string }) => {
    const id = Math.random().toString(36).substring(7);
    setActiveJobs((prev) => [...prev, { id, title, description: options?.description, type: options?.type, link_url: options?.link_url }]);

    promise.then((res) => {
      const jobId = res?.backgroundJobId || res?.jobId;
      if (jobId) {
        setActiveJobs((prev) => prev.map((u) => u.id === id ? { ...u, jobId } : u));
      } else {
        setTimeout(() => removeJob(id), 500);
      }
    }).catch(() => {
      setTimeout(() => removeJob(id), 500);
    });
  };

  return (
    <GlobalProgressContext.Provider value={{ activeJobs, addJob, removeJob }}>
      {children}
    </GlobalProgressContext.Provider>
  );
}

export function useGlobalProgress() {
  const context = useContext(GlobalProgressContext);
  if (!context) {
    throw new Error("useGlobalProgress must be used within a GlobalProgressProvider");
  }
  return context;
}
