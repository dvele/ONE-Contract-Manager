import useAuthHelper from "@/hooks/use-auth-helper";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function unAuthorized() {
  const { isSales } = useAuthHelper();
  const [_, setLocation] = useLocation();
  if (isSales) {
    setLocation("/");
  }
  return (
    <div className="mt-48 flex h-full w-full flex-col items-center gap-4">
      <Lock />
      <h1 className="text-4xl font-bold">Unauthorized Access</h1>
      <p className="max-w-[600px] text-center">
        You do not have the necessary permissions to access this tool. Please
        contact the tech team for assistance.
      </p>
    </div>
  );
}
