import { trpc } from "@/lib/trpc";
import supabase from "@/lib/supabase";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Only redirect if it's an actual UNAUTHORIZED error code, not just a message match
  // This prevents false positives from other errors
  const isUnauthorized = error.data?.code === 'UNAUTHORIZED';

  if (!isUnauthorized) return;

  // Don't redirect if we're already on the login page
  if (window.location.pathname.includes('login') || window.location.pathname === '/') return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // Only log unexpected errors, not auth errors from protected procedures in demo mode
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      // Skip logging auth errors - these are expected in demo mode
      return;
    }
    
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // Only log unexpected errors, not auth errors from protected procedures in demo mode
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      // Skip logging auth errors - these are expected in demo mode
      return;
    }
    
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return {};
        return { Authorization: `Bearer ${session.access_token}` };
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
