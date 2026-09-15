import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Layers, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  phaseNumber: number;
  name: string | null;
}

interface Property {
  id: number;
  propertyCode: string;
  phaseId: number | null;
  apn: string | null;
  lotNumber: string | null;
  address: string | null;
}

export const PropertyPhaseEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<Phase | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phasesKey = ["/api/projects", projectId, "phases"];
  const propertiesKey = ["/api/projects", projectId, "properties"];
  const pricingKey = ["/api/projects", projectId, "pricing-summary"];

  const { data: phases = [] } = useQuery<Phase[]>({ queryKey: phasesKey });
  const { data: propertyRows = [] } = useQuery<Property[]>({ queryKey: propertiesKey });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: phasesKey });
    queryClient.invalidateQueries({ queryKey: propertiesKey });
    // The pricing summary carries each phase's derived schedule dates, which
    // Step 6 renders. Without this a phase added here shows four TBDs there
    // until something else happens to invalidate the summary.
    queryClient.invalidateQueries({ queryKey: pricingKey });
  };

  const addPhase = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/phases`, {}),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not add the phase. Try again."),
  });

  const patchPhase = useMutation({
    mutationFn: ({ phaseId, name }: { phaseId: number; name: string }) =>
      apiRequest("PATCH", `/api/phases/${phaseId}`, { name }),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not rename the phase. Try again."),
  });

  const removePhase = useMutation({
    mutationFn: (phaseId: number) => apiRequest("DELETE", `/api/phases/${phaseId}`),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not delete the phase. Try again."),
  });

  const addProperty = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/properties`, {}),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not add the property. Try again."),
  });

  const assignPhase = useMutation({
    mutationFn: ({ propertyId, phaseId }: { propertyId: number; phaseId: number | null }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { phaseId }),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not update the phase assignment. Try again."),
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, field, value }: { propertyId: number; field: string; value: string }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { [field]: value }),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Could not save the change. Try again."),
  });

  const removeProperty = useMutation({
    mutationFn: (propertyId: number) => apiRequest("DELETE", `/api/properties/${propertyId}`),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Remove the units attached to this property before deleting it."),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
              Properties &amp; Phases
            </CardTitle>
            <CardDescription>
              Each property is one lot, holding up to a home and an ADU. Phases group
              properties for pricing, scheduling and payment milestones.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addPhase.mutate()}
              disabled={addPhase.isPending}
              data-testid="button-add-phase"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Phase
            </Button>
            <Button
              size="sm"
              onClick={() => addProperty.mutate()}
              disabled={addProperty.isPending}
              data-testid="button-add-property"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Property
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {phases.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Phases</h3>
            {phases.map((phase) => {
              const defaultName = `Phase ${phase.phaseNumber}`;
              return (
                <div
                  key={phase.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border p-2"
                  data-testid={`row-phase-${phase.id}`}
                >
                  <Badge variant="secondary">Phase {phase.phaseNumber}</Badge>
                  <div className="flex-1 min-w-[10rem] space-y-1">
                    <Label htmlFor={`phase-name-${phase.id}`} className="text-xs">
                      Name
                    </Label>
                    <Input
                      // Remount when the server value changes so defaultValue re-syncs
                      // instead of showing the stale typed input.
                      key={`phase-name-${phase.id}-${phase.name ?? ""}`}
                      id={`phase-name-${phase.id}`}
                      defaultValue={phase.name ?? ""}
                      placeholder={defaultName}
                      onBlur={(e) =>
                        patchPhase.mutate({ phaseId: phase.id, name: e.target.value })
                      }
                      data-testid={`input-phase-name-${phase.id}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePhaseTarget(phase)}
                    // Scoped to the phase in flight: a bare isPending would grey out
                    // the delete button on every phase in the project.
                    disabled={removePhase.isPending && removePhase.variables === phase.id}
                    aria-label={`Delete ${phase.name || defaultName}`}
                    data-testid={`button-delete-phase-${phase.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {propertyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No properties yet. Add one for each lot in the project.
          </p>
        ) : (
          propertyRows.map((property) => {
            const detailsId = `property-details-${property.id}`;
            const isExpanded = expanded === property.id;
            return (
              <div key={property.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{property.propertyCode}</Badge>
                    <Select
                      value={property.phaseId ? String(property.phaseId) : "unassigned"}
                      onValueChange={(value) =>
                        assignPhase.mutate({
                          propertyId: property.id,
                          phaseId: value === "unassigned" ? null : parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger
                        className="w-44"
                        aria-label={`Phase for property ${property.propertyCode}`}
                        data-testid={`select-phase-${property.id}`}
                      >
                        <SelectValue placeholder="Assign a phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {phases.map((phase) => (
                          <SelectItem key={phase.id} value={String(phase.id)}>
                            {phase.name || `Phase ${phase.phaseNumber}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isExpanded ? null : property.id)}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      data-testid={`button-details-${property.id}`}
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(property)}
                      disabled={removeProperty.isPending}
                      aria-label={`Delete property ${property.propertyCode}`}
                      data-testid={`button-delete-property-${property.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div id={detailsId} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                    {(["apn", "lotNumber", "address"] as const).map((field) => (
                      <div key={field} className="space-y-1">
                        <Label htmlFor={`${field}-${property.id}`} className="text-xs">
                          {field === "apn" ? "APN" : field === "lotNumber" ? "Lot Number" : "Address"}
                        </Label>
                        <Input
                          // Remount when the server value changes (e.g. trimmed on save) so
                          // defaultValue re-syncs instead of showing the stale typed input.
                          key={`${field}-${property.id}-${property[field] ?? ""}`}
                          id={`${field}-${property.id}`}
                          defaultValue={property[field] || ""}
                          onBlur={(e) =>
                            patchProperty.mutate({
                              propertyId: property.id,
                              field,
                              value: e.target.value,
                            })
                          }
                          data-testid={`input-${field}-${property.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        <p className="text-sm text-destructive" aria-live="polite" data-testid="text-editor-error">
          {errorMessage}
        </p>
      </CardContent>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Property"
        description={`Are you sure you want to delete ${deleteTarget?.propertyCode}? This action cannot be undone.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeProperty.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />

      <DeleteConfirmDialog
        open={!!deletePhaseTarget}
        onOpenChange={(open) => !open && setDeletePhaseTarget(null)}
        title="Delete Phase"
        description={`Delete ${
          deletePhaseTarget?.name || `Phase ${deletePhaseTarget?.phaseNumber}`
        }? Its properties will be unassigned, not deleted, and can be reassigned to another phase. This action cannot be undone.`}
        onConfirm={() => {
          if (!deletePhaseTarget) return;
          removePhase.mutate(deletePhaseTarget.id, { onSettled: () => setDeletePhaseTarget(null) });
        }}
      />
    </Card>
  );
};
