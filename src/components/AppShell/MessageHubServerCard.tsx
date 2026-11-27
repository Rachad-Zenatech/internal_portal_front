import { Activity, CheckCircle2, Layers, Server, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HubChannelGroupStatus, HubConnectedServer } from "@/types/messageHub";

export function formatHubLastSeen(iso?: string | null): string {
  if (!iso) return "No heartbeat";
  try {
    const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (diffSec < 5) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "Live";
  }
}

export function HubServerStatusBadge({ online, status }: { online: boolean; status: string }) {
  if (online) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 gap-1"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        ONLINE
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 gap-1"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        DEGRADED
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0 gap-1"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      OFFLINE
    </Badge>
  );
}

function HubMetricTile({
  label,
  unit,
  Icon,
  iconClass,
  group,
}: {
  label: string;
  unit: string;
  Icon: typeof Layers;
  iconClass: string;
  group: HubChannelGroupStatus;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/70 p-2">
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          {label}
        </span>
        {group.working ? (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            Down
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>
          {group.items.length} {unit}
        </span>
        <span>{group.roundtrip_ms != null ? `${group.roundtrip_ms}ms` : `c:${group.consumers}`}</span>
      </div>
    </div>
  );
}

export function OnlineServerCard({ srv }: { srv: HubConnectedServer }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border/50 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Server className="h-4 w-4 text-emerald-500" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-foreground">{srv.name}</span>
              {srv.is_self && (
                <Badge variant="secondary" className="h-3.5 px-1 py-0 text-[9px] font-medium">
                  This App
                </Badge>
              )}
            </div>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {srv.service_user}
            </span>
          </div>
        </div>
        <HubServerStatusBadge online={srv.online} status={srv.status} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <HubMetricTile label="Queues" unit="queues" Icon={Layers} iconClass="text-blue-500" group={srv.queues} />
        <HubMetricTile label="Streams" unit="streams" Icon={Activity} iconClass="text-purple-500" group={srv.streams} />
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{srv.connection_state}</span>
        <span>Heartbeat: {formatHubLastSeen(srv.last_seen)}</span>
      </div>
    </div>
  );
}

export function OfflineServerRow({ srv }: { srv: HubConnectedServer }) {
  return (
    <div
      title={`State: DISCONNECTED • ${formatHubLastSeen(srv.last_seen)}`}
      className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        <span className="truncate text-xs font-medium text-foreground/80">{srv.name}</span>
      </div>
      <HubServerStatusBadge online={srv.online} status={srv.status} />
    </div>
  );
}
