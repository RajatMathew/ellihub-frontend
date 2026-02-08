import { AppRouting } from "@app/routing";
import { Toaster } from "@app/components/ui/sonner";
import { LoadingBarContainer } from "react-top-loading-bar";
import "@app/styles/globals.css";
import { AppLayout } from "./components/layouts";

export function App() {
  return (
    <LoadingBarContainer>
      <AppLayout>
        <AppRouting />
      </AppLayout>
      <Toaster />
    </LoadingBarContainer>
  );
}
