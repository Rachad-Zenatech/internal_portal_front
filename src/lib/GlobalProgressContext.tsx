import { createContext, useContext, useState, type ReactNode } from "react";

type JobType = "document" | "database" | "upload" | "generic";

type GlobalProgressContextType = {
  activeJobs: { id: string; title: string; jobId?: string; description?: string; type?: JobType }[];
  addJob: (title: string, promise: Promise<any>, options?: { description?: string; type?: JobType }) => void;
  removeJob: (id: string) => void;
};

const GlobalProgressContext = createContext<GlobalProgressContextType | undefined>(undefined);

export function GlobalProgressProvider({ children }: { children: ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<{ id: string; title: string; jobId?: string; description?: string; type?: JobType }[]>([]);

  const removeJob = (id: string) => {
    setActiveJobs((prev) => prev.filter((u) => u.id !== id));
  };

  const addJob = (title: string, promise: Promise<any>, options?: { description?: string; type?: JobType }) => {
    const id = Math.random().toString(36).substring(7);
    setActiveJobs((prev) => [...prev, { id, title, description: options?.description, type: options?.type }]);

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
