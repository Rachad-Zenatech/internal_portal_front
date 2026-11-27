import { AlertTriangle, CheckCircle2, ChevronDown, Network, RefreshCw, XCircle, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMessageHubStatus } from "@/hooks/useMessageHubStatus";
import { HUB_SERVERS } from "@/services/messageHubService";
import { OfflineServerRow, OnlineServerCard } from "./MessageHubServerCard";

function getStatusDotClass(status: string): string {
  switch (status) {
    case "online":
      return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)] animate-pulse";
    case "degraded":
      return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.75)] animate-pulse";
    case "offline":
    default:
      return "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]";
  }
}

function HubDropdownHeader({
  vhost,
  host,
  version,
  onlineCount,
  shownTotal,
  overallStatus,
  isTesting,
  onTest,
}: {
  vhost?: string;
  host?: string;
  version?: string;
  onlineCount: number;
  shownTotal: number;
  overallStatus: "online" | "degraded" | "offline";
  isTesting: boolean;
  onTest: () => void;
}) {
  const barWidth = `${shownTotal ? (onlineCount / shownTotal) * 100 : 0}%`;
  return (
    <div className="space-y-3 border-b border-border/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Network className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">RabbitMQ Message Hub</span>
            {vhost && (
              <Badge variant="secondary" className="h-4 px-1.5 py-0 font-mono text-[10px]">
                {vhost}
              </Badge>
            )}
          </div>
          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
            {host || "127.0.0.1:5672"} • RabbitMQ v{version || "4.x"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTesting}
          className="h-7 shrink-0 gap-1.5 px-2.5 text-[11px] text-foreground"
          title="Actively test Queues and Streams round-trip"
        >
          <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin text-primary" : ""}`} />
          Test Hub
        </Button>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Application servers</span>
          <span className="font-mono">
            {onlineCount}/{shownTotal} online
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${overallStatus === "online" ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: barWidth }}
          />
        </div>
      </div>
    </div>
  );
}

function HubDropdownFooter({ overallStatus }: { overallStatus: "online" | "degraded" | "offline" }) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Zap className="h-3 w-3 text-amber-500" />
        Live event stream + 3s sync
      </span>
      <div className="flex items-center gap-1 font-medium">
        {overallStatus === "online" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : overallStatus === "degraded" ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-rose-500" />
        )}
        <span className="capitalize">{overallStatus}</span>
      </div>
    </div>
  );
}

export function MessageHubStatusDropdown({ className = "" }: { className?: string }) {
  const { resolvedData, isTesting, runActiveTest } = useMessageHubStatus();

  const servers = resolvedData.servers;
  const onlineCount = servers.filter((s) => s.online).length;
  const totalCount = servers.length;
  const hubConnected = Boolean(resolvedData.connected && onlineCount > 0);
  const overallStatus: "online" | "degraded" | "offline" =
    !resolvedData.connected || onlineCount === 0
      ? "offline"
      : onlineCount < totalCount
      ? "degraded"
      : "online";

  const orderedServers = [...servers].sort((a, b) => {
    if (Boolean(a.is_self) !== Boolean(b.is_self)) return a.is_self ? -1 : 1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const liveServers = orderedServers.filter((s) => s.online);
  const downServers = orderedServers.filter((s) => !s.online);
  const shownTotal = totalCount || HUB_SERVERS.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="RabbitMQ Message Hub Live Server Status"
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium border border-border/60 bg-background/80 hover:bg-muted/60 transition-all duration-150 cursor-pointer shadow-sm ${className}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(overallStatus)}`} />
          <Network className="h-3.5 w-3.5 text-primary hidden sm:inline-block" />
          <span className="hidden sm:inline-block text-foreground font-mono text-[11px]">
            {hubConnected ? `Hub ${onlineCount}/${shownTotal}` : "Hub Offline"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="flex w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border-border bg-popover/95 p-0 shadow-xl backdrop-blur sm:w-[26rem]"
      >
        <HubDropdownHeader
          vhost={resolvedData.hub?.vhost}
          host={resolvedData.hub?.host}
          version={resolvedData.hub?.version}
          onlineCount={onlineCount}
          shownTotal={shownTotal}
          overallStatus={overallStatus}
          isTesting={isTesting}
          onTest={runActiveTest}
        />

        <div className="max-h-[min(60vh,30rem)] space-y-4 overflow-y-auto px-4 py-3">
          {liveServers.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Online ({liveServers.length})
              </h3>
              {liveServers.map((srv) => (
                <OnlineServerCard key={srv.id} srv={srv} />
              ))}
            </section>
          )}

          {downServers.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Offline ({downServers.length})
              </h3>
              {downServers.map((srv) => (
                <OfflineServerRow key={srv.id} srv={srv} />
              ))}
            </section>
          )}
        </div>

        <HubDropdownFooter overallStatus={overallStatus} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
