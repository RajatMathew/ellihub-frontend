import { AppRouting } from "@app/routing";
import { Toaster } from "@app/components/ui/sonner";
import { LoadingBarContainer } from "react-top-loading-bar";
import "@app/styles/globals.css";
import { AppLayout } from "./components/layouts";
import { QueryProvider } from "./providers/query";

export function App() {
  return (
    <QueryProvider>
      <LoadingBarContainer>
        <AppLayout>
          <AppRouting />
        </AppLayout>
        <Toaster />
      </LoadingBarContainer>
    </QueryProvider>
  );
}
