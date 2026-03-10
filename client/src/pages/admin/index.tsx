import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export default function AdminGeneral() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            General Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your organization settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Organization Information</CardTitle>
                <CardDescription>
                  Your company details used across contracts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  defaultValue="Dvele"
                  disabled
                  data-testid="input-org-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Organization Slug</Label>
                <Input
                  id="org-slug"
                  defaultValue="dvele"
                  disabled
                  data-testid="input-org-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-state">Default State of Formation</Label>
              <Input
                id="default-state"
                disabled
                defaultValue="Delaware"
                data-testid="input-default-state"
              />
            </div>
          </CardContent>
        </Card>

        {/* <div className="flex justify-end">
          <Button data-testid="button-save-settings">
            Save Changes
          </Button>
        </div> */}
      </div>
    </AdminLayout>
  );
}
