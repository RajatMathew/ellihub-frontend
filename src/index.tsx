import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App } from "./app";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";

function FrameWork() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="vite-theme"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route path="app/*" element={<App />} />
            <Route path="*" element={<Navigate to="/app" />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default FrameWork;
