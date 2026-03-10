import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AgreementsNew from "@/pages/agreements-new";
import Settings from "@/pages/settings";
import ClauseLibrary from "@/pages/clause-library";
import Contracts from "@/pages/contracts";
import ContractDetail from "@/pages/contract-detail";
import Templates from "@/pages/templates";
import ContractPreview from "@/pages/contract-preview";
import GenerateContracts from "@/pages/generate-contracts";
import TemplatesUpload from "@/pages/templates-upload";
import Exhibits from "@/pages/exhibits";
import StateDisclosures from "@/pages/state-disclosures";
import ComponentLibrary from "@/pages/component-library";
import AdminGeneral from "@/pages/admin/index";
import AdminHomeModels from "@/pages/admin/home-models";
import AdminLLCs from "@/pages/admin/llcs";
import AdminExhibits from "@/pages/admin/exhibits";
import AdminStateDisclosures from "@/pages/admin/state-disclosures";
import AdminContractTemplates from "@/pages/admin/contract-templates";
import AdminContractorEntities from "@/pages/admin/contractor-entities";
import AdminProjectUnits from "@/pages/admin/project-units";
import AdminImportTemplates from "@/pages/admin/import-templates";
import AdminVariables from "@/pages/admin/variables";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/agreements/new" component={AgreementsNew} />
      <Route path="/clause-library" component={ClauseLibrary} />
      <Route path="/component-library" component={ComponentLibrary} />
      <Route path="/exhibits" component={Exhibits} />
      <Route path="/state-disclosures" component={StateDisclosures} />
      <Route path="/contract-preview" component={ContractPreview} />
      <Route path="/generate-contracts" component={GenerateContracts} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/contracts/:id" component={ContractDetail} />
      <Route path="/contracts/:id/edit" component={ContractDetail} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates-upload" component={TemplatesUpload} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminGeneral} />
      <Route path="/admin/home-models" component={AdminHomeModels} />
      <Route path="/admin/llcs" component={AdminLLCs} />
      <Route path="/admin/exhibits" component={AdminExhibits} />
      <Route path="/admin/state-disclosures" component={AdminStateDisclosures} />
      <Route path="/admin/contract-templates" component={AdminContractTemplates} />
      <Route path="/admin/contractor-entities" component={AdminContractorEntities} />
      <Route path="/admin/project-units" component={AdminProjectUnits} />
      <Route path="/admin/import-templates" component={AdminImportTemplates} />
      <Route path="/admin/variables" component={AdminVariables} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dvele-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
