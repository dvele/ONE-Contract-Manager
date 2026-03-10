import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  status,
  size = "default",
}: {
  status: string;
  size?: "default" | "sm";
}) {
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    draft: { label: "Draft", variant: "secondary" },
    pending_review: { label: "Pending Review", variant: "outline" },
    approved: { label: "Approved", variant: "default" },
    signed: { label: "Signed", variant: "default" },
    expired: { label: "Expired", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <Badge
      variant={config.variant}
      className={size === "sm" ? "px-2 py-0 text-xs" : ""}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}

export function LLCStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    pending: { label: "Pending", variant: "outline" },
    formed: { label: "Formed", variant: "default" },
    dissolved: { label: "Dissolved", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <Badge variant={config.variant} data-testid={`badge-llc-status-${status}`}>
      {config.label}
    </Badge>
  );
}
