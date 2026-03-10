import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface ProjectUnit {
  id: number;
  projectId: number;
  modelId: number;
  unitLabel: string;
  basePriceSnapshot?: number;
  customizationTotal?: number;
  modelName?: string;
  modelCode?: string;
  projectName?: string;
}

function formatCurrency(cents: number | undefined): string {
  if (!cents) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function AdminProjectUnits() {
  const { data: projectUnits, isLoading } = useQuery<ProjectUnit[]>({
    queryKey: ["/api/project-units"],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              Project Units
            </h1>
            <p className="text-muted-foreground mt-1">
              View units assigned to projects
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Unit Label</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Customization</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectUnits?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No project units found. Units are created during contract generation.
                    </TableCell>
                  </TableRow>
                ) : (
                  projectUnits?.map((unit) => (
                    <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                      <TableCell>
                        {unit.projectName ? (
                          <Link href={`/generate-contracts?projectId=${unit.projectId}`} className="flex items-center gap-1 text-primary hover:underline">
                            {unit.projectName}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{unit.unitLabel}</TableCell>
                      <TableCell>{unit.modelName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{unit.modelCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(unit.basePriceSnapshot)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(unit.customizationTotal)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency((unit.basePriceSnapshot || 0) + (unit.customizationTotal || 0))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
