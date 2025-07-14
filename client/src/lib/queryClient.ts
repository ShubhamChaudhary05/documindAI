import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Base URL for the Flask backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const responseText = await res.text();
    let errorMessage = responseText;
    try {
      const errorObj = JSON.parse(responseText);
      errorMessage = errorObj.error || errorMessage;
    } catch {
      // Response is not JSON, use text
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  url: string,
  body?: FormData | Record<string, any>
): Promise<Response> {
  const isFormData = body instanceof FormData;
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const options: RequestInit = {
    method,
    headers: isFormData
      ? {} // Let the browser set the content-type for FormData
      : { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(fullUrl, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }): Promise<any> => {
    const [url] = queryKey as [string];
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl);

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else {
        throw new Error("Unauthorized");
      }
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
