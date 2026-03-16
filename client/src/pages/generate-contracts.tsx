import { Button } from "@/components/ui/button";
import { WizardProvider, WizardShell } from "@/components/wizard";
import { ChevronLeft } from "lucide-react";
import { Link, useSearch } from "wouter";

export default function GenerateContractsPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const projectId = params.get("projectId");

  return (
    <div className="container relative mx-auto w-full py-8">
      <Button variant="outline" className="absolute left-8" asChild>
        <Link to="contracts" className={"flex gap-2"}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Contracts
        </Link>
      </Button>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">
          {projectId ? "Resume Contract Draft" : "Generate Contracts"}
        </h1>
        <p className="text-muted-foreground">
          {projectId
            ? "Continue working on your saved contract draft"
            : "Create contract package for your project in 9 easy steps"}
        </p>
      </div>

      <WizardProvider loadProjectId={projectId}>
        <WizardShell />
      </WizardProvider>
    </div>
  );
}
