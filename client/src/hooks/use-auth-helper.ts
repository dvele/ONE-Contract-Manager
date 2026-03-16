import { fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const useAuthHelper = () => {
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const [isSales, setIsSales] = useState(true);

  useEffect(() => {
    fetchAuthSession({ forceRefresh: true }).then((session) => {
      const payload = session.tokens?.idToken?.payload;
      const groups = (payload?.["cognito:groups"] as string[]) ?? [];

      const isSales = groups.includes("sales");
      setIsSales(isSales);

      setCurrentUserIsAdmin(groups.includes("admin"));
      setEmail((payload?.email as string) ?? null);
    });
  }, [location]);

  useEffect(() => {
    if (!isSales) {
      setLocation("/unauthorized");
    }
  }, [location, isSales]);

  return { currentUserIsAdmin, isSales, email };
};
export default useAuthHelper;
