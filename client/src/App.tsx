import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Authenticator } from "@aws-amplify/ui-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import unAuthorized from "@/pages/unauthorized";
import Dashboard from "@/pages/dashboard";
import ClauseLibrary from "@/pages/clause-library";
import Contracts from "@/pages/contracts";
import ContractDetail from "@/pages/contract-detail";
import Templates from "@/pages/templates";
import ContractPreview from "@/pages/contract-preview";
import GenerateContracts from "@/pages/generate-contracts";
import TemplatesUpload from "@/pages/templates-upload";
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
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/component-library" component={ComponentLibrary} />
      <Route path="/state-disclosures" component={StateDisclosures} />
      <Route path="/contract-preview" component={ContractPreview} />
      <Route path="/generate-contracts" component={GenerateContracts} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/contracts/:id" component={ContractDetail} />
      <Route path="/contracts/:id/edit" component={ContractDetail} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates-upload" component={TemplatesUpload} />
      <Route path="/admin" component={AdminGeneral} />
      <Route path="/admin/clause-library" component={ClauseLibrary} />
      <Route path="/admin/component-library" component={ComponentLibrary} />
      <Route path="/admin/home-models" component={AdminHomeModels} />
      <Route path="/admin/llcs" component={AdminLLCs} />
      <Route path="/admin/exhibits" component={AdminExhibits} />
      <Route
        path="/admin/state-disclosures"
        component={AdminStateDisclosures}
      />
      <Route
        path="/admin/contract-templates"
        component={AdminContractTemplates}
      />
      <Route
        path="/admin/contractor-entities"
        component={AdminContractorEntities}
      />
      <Route path="/admin/project-units" component={AdminProjectUnits} />
      <Route path="/admin/import-templates" component={AdminImportTemplates} />
      <Route path="/admin/variables" component={AdminVariables} />
      <Route path="/unauthorized" component={unAuthorized} />
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
      <div className="flex min-h-screen w-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
const redirectURL = import.meta.env["VITE_FRONTEND_URL"];
Amplify.configure({
  Auth: {
    Cognito: {
      //oauthSignIn: true,
      loginWith: {
        oauth: {
          scopes: [
            "email",
            "openid",
            "profile",
            "aws.cognito.signin.user.admin",
          ],
          domain: "onedvele.auth.us-west-1.amazoncognito.com",
          redirectSignIn: [redirectURL],
          redirectSignOut: [redirectURL + "/login"],
          responseType: "code",
        },
      },
      identityPoolId: import.meta.env["VITE_COGNITO_IDENTITY_POOL_ID"],
      // region: import.meta.env["VITE_COGNITO_REGION"],
      userPoolId: import.meta.env["VITE_COGNITO_USER_POOL_ID"],
      userPoolClientId: import.meta.env["VITE_COGNITO_APP_ID"],
    },
  },
});

const authComponents = {
  Header() {
    return (
      <div className="mt-24 p-8 text-center">
        <h1 className="text-3xl font-bold">Dvele Contract Generator</h1>
      </div>
    );
  },
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dvele-ui-theme">
      <Authenticator
        socialProviders={["google"]}
        components={authComponents}
        hideSignUp={true}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </Authenticator>
    </ThemeProvider>
  );
}

export default App;
