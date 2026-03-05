import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useProjectStore } from "./controller/useProjectStore";
import { Container } from "./view/layout/Container";
import { PrivacyFooter } from "./view/layout/PrivacyFooter";
import { Topbar } from "./view/layout/Topbar";
import { PlannerPage } from "./view/pages/PlannerPage";
import { WizardPage } from "./view/pages/WizardPage";
import { Button } from "./components/ui/button";

export default function App() {
  const loading = useProjectStore((state) => state.loading);
  const error = useProjectStore((state) => state.error);
  const clearError = useProjectStore((state) => state.clearError);
  const page = useProjectStore((state) => state.page);
  const isMagicGenerating = useProjectStore((state) => state.isMagicGenerating);
  const initialize = useProjectStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <Topbar />
      <Container>
        {loading && <div className="rounded-xl bg-slate-100 p-4">Loading local IndexedDB project...</div>}

        {!loading && error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
            <Button size="sm" variant="outline" onClick={clearError}>
              Close
            </Button>
          </div>
        )}

        {!loading && page === "wizard" && <WizardPage />}
        {!loading && page === "planner" && <PlannerPage />}
      </Container>
      <PrivacyFooter />

      {isMagicGenerating && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
          <div className="flex min-w-[320px] flex-col items-center rounded-2xl border border-border bg-white px-8 py-7 shadow-2xl">
            <div className="relative mb-4 h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary" />
              <div className="absolute inset-[18px] rounded-full bg-primary/10 animate-pulse" />
            </div>
            <div className="text-base font-bold">Magic generation in progress</div>
            <div className="mt-1 text-sm text-muted-foreground">Optimizing vacations and team transfers...</div>
          </div>
        </div>
      )}
    </div>
  );
}
