import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Get headers with Cognito JWT authentication
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  let session;

  // First render can have a race condition getting the users session.
  // We attempt standard fetch first.
  try {
    session = await fetchAuthSession();
    if (!session.tokens) throw new Error("No session tokens found");
  } catch (e) {
    // Second attempt forces a refresh to ensure we get the session correctly (matches original retry logic)
    try {
      session = await fetchAuthSession({ forceRefresh: true });
    } catch (innerError) {
      console.error("Failed to fetch auth session", innerError);
      return {}; // Return empty or handle error as needed
    }
  }

  // In v6, we access tokens.idToken.toString()
  const token = session.tokens?.idToken?.toString();

  if (!token) {
    // Handle case where token is still missing (user might be logged out)
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const headers = await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
