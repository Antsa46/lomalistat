import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileUp,
  FlaskConical,
  RotateCcw,
  Save,
  Wand2
} from "lucide-react";
import { useProjectStore } from "../../controller/useProjectStore";
import { exportProjectToJson } from "../../controller/project-io";
import {
  isSavePickerSupported,
  pickSaveFileHandle,
  saveBlobFileWithDialog,
  saveTextFileWithDialog,
  type SaveFileHandle,
  writeTextToFileHandle
} from "../../lib/utils";
import { Button } from "../../components/ui/button";

export function Topbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSavedContentRef = useRef<string>("");
  const project = useProjectStore((state) => state.project);
  const page = useProjectStore((state) => state.page);
  const setPage = useProjectStore((state) => state.setPage);
  const importProject = useProjectStore((state) => state.importProject);
  const exportProject = useProjectStore((state) => state.exportProject);
  const generateDemoData = useProjectStore((state) => state.generateDemoData);
  const resetLocalData = useProjectStore((state) => state.resetLocalData);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveHandle, setAutoSaveHandle] = useState<SaveFileHandle | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!project) {
      setAutoSaveEnabled(false);
      setAutoSaveState("idle");
      lastAutoSavedContentRef.current = "";
    }
  }, [project]);

  useEffect(() => {
    if (!autoSaveEnabled || !autoSaveHandle || !project) {
      return;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const content = exportProjectToJson(project);
          if (content === lastAutoSavedContentRef.current) {
            return;
          }
          setAutoSaveState("saving");
          await writeTextToFileHandle(autoSaveHandle, content);
          lastAutoSavedContentRef.current = content;
          setAutoSaveState("saved");
        } catch {
          setAutoSaveEnabled(false);
          setAutoSaveState("error");
          window.alert("Auto-save failed. Auto-save to file was turned off.");
        }
      })();
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, autoSaveHandle, project]);

  const ensureAutoSaveFileHandle = async (): Promise<SaveFileHandle | null> => {
    if (autoSaveHandle) {
      return autoSaveHandle;
    }
    if (!isSavePickerSupported()) {
      window.alert("Auto-save to a chosen file requires a browser with File System Access API support.");
      return null;
    }
    const data = exportProject();
    if (!data) {
      return null;
    }
    const handle = await pickSaveFileHandle(data.filename, {
      description: "Project JSON",
      mimeType: "application/json",
      extensions: [".json"]
    });
    if (!handle) {
      return null;
    }
    setAutoSaveHandle(handle);
    setAutoSaveState("idle");
    lastAutoSavedContentRef.current = "";
    return handle;
  };

  const writeCurrentProjectToAutoSaveFile = async (handle: SaveFileHandle): Promise<boolean> => {
    if (!project) {
      return false;
    }
    try {
      const content = exportProjectToJson(project);
      setAutoSaveState("saving");
      await writeTextToFileHandle(handle, content);
      lastAutoSavedContentRef.current = content;
      setAutoSaveState("saved");
      return true;
    } catch {
      setAutoSaveState("error");
      return false;
    }
  };

  const toggleAutoSave = async () => {
    if (!project) {
      return;
    }
    if (autoSaveEnabled) {
      setAutoSaveEnabled(false);
      setAutoSaveState("idle");
      return;
    }

    const handle = await ensureAutoSaveFileHandle();
    if (!handle) {
      return;
    }
    const written = await writeCurrentProjectToAutoSaveFile(handle);
    if (!written) {
      window.alert("Could not start auto-save for the selected file.");
      setAutoSaveEnabled(false);
      return;
    }
    setAutoSaveEnabled(true);
  };

  const chooseAutoSaveFile = async () => {
    if (!project) {
      return;
    }
    if (!isSavePickerSupported()) {
      window.alert("This browser does not support choosing an auto-save file.");
      return;
    }
    const data = exportProject();
    if (!data) {
      return;
    }
    const handle = await pickSaveFileHandle(data.filename, {
      description: "Project JSON",
      mimeType: "application/json",
      extensions: [".json"]
    });
    if (!handle) {
      return;
    }
    setAutoSaveHandle(handle);
    lastAutoSavedContentRef.current = "";
    if (autoSaveEnabled) {
      const ok = await writeCurrentProjectToAutoSaveFile(handle);
      if (!ok) {
        setAutoSaveEnabled(false);
        window.alert("Could not write to the selected file. Auto-save was turned off.");
      }
    } else {
      setAutoSaveState("idle");
    }
  };

  const autoSaveStatusText =
    autoSaveState === "saving"
      ? "saving..."
      : autoSaveState === "saved"
        ? "saved"
        : autoSaveState === "error"
          ? "error"
          : "idle";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        <div className="mr-3 flex items-center gap-2">
          <Wand2 size={18} className="text-primary" />
          <div>
            <div className="text-sm font-bold">Lomalistat</div>
            <div className="text-xs text-muted-foreground">Offline-first / IndexedDB only</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) {
                return;
              }
              const text = await file.text();
              await importProject(text);
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={14} className="mr-1" /> Import JSON
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const data = exportProject();
              if (!data) {
                return;
              }
              try {
                await saveTextFileWithDialog(data.filename, data.content, {
                  description: "Project JSON",
                  mimeType: "application/json",
                  extensions: [".json"]
                });
              } catch {
                window.alert("Saving JSON failed in this browser.");
              }
            }}
            disabled={!project}
          >
            <Download size={14} className="mr-1" /> Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!project) {
                return;
              }
              const vacationsOnly = window.confirm(
                "Export vacations-only PDF?\n\nOK = vacations only\nCancel = full report (includes groups, skills and violations)"
              );
              const { exportProjectToPdf } = await import("../../controller/project-pdf");
              const pdf = await exportProjectToPdf(project, {
                mode: vacationsOnly ? "vacations_only" : "full"
              });
              const normalizedBytes = new Uint8Array(Array.from(pdf.bytes));
              const blob = new Blob([normalizedBytes], { type: "application/pdf" });
              try {
                await saveBlobFileWithDialog(pdf.filename, blob, {
                  description: "PDF document",
                  mimeType: "application/pdf",
                  extensions: [".pdf"]
                });
              } catch {
                window.alert("Saving PDF failed in this browser.");
              }
            }}
            disabled={!project}
          >
            <FileText size={14} className="mr-1" /> Export PDF
          </Button>
          <Button onClick={() => void generateDemoData(1337)}>
            <FlaskConical size={14} className="mr-1" /> Generate demo data (250 ppl)
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const confirmReset = window.confirm(
                "Delete all locally stored data from this browser? This cannot be undone."
              );
              if (confirmReset) {
                void resetLocalData();
              }
            }}
          >
            <RotateCcw size={14} className="mr-1" /> Clear local data
          </Button>
          <Button
            size="sm"
            variant={autoSaveEnabled ? "default" : "outline"}
            onClick={() => void toggleAutoSave()}
            disabled={!project}
          >
            <Save size={13} className="mr-1" /> Auto-save {autoSaveEnabled ? "ON" : "OFF"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void chooseAutoSaveFile()} disabled={!project}>
            Set auto-save file
          </Button>
          <div className="text-xs text-muted-foreground">
            {autoSaveEnabled ? `Auto-save: ${autoSaveStatusText}` : "Auto-save: off"}
            {autoSaveHandle?.name ? ` (${autoSaveHandle.name})` : ""}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant={page === "wizard" ? "default" : "outline"} onClick={() => setPage("wizard")}>
            Wizard
          </Button>
          <Button
            variant={page === "planner" ? "default" : "outline"}
            onClick={() => setPage("planner")}
            disabled={!project}
          >
            Planner
          </Button>
        </div>
      </div>
    </header>
  );
}
