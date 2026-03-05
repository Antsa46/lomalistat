import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, waitMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  downloadBlobFile(filename, blob);
}

export function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type PickerAcceptType = {
  description: string;
  mimeType: string;
  extensions: string[];
};

type SaveWritable = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

export type SaveFileHandle = {
  name?: string;
  createWritable: () => Promise<SaveWritable>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function pickerTypesFromAccept(acceptType?: PickerAcceptType) {
  if (!acceptType) {
    return undefined;
  }
  return [
    {
      description: acceptType.description,
      accept: {
        [acceptType.mimeType]: acceptType.extensions
      }
    }
  ];
}

export function isSavePickerSupported(): boolean {
  return Boolean((window as SavePickerWindow).showSaveFilePicker);
}

export async function pickSaveFileHandle(
  filename: string,
  acceptType?: PickerAcceptType
): Promise<SaveFileHandle | null> {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker) {
    return null;
  }

  try {
    const handle = await picker({
      suggestedName: filename,
      types: pickerTypesFromAccept(acceptType)
    });
    return handle;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
}

export async function writeBlobToFileHandle(handle: SaveFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function writeTextToFileHandle(
  handle: SaveFileHandle,
  content: string,
  mimeType = "application/json;charset=utf-8"
): Promise<void> {
  await writeBlobToFileHandle(handle, new Blob([content], { type: mimeType }));
}

export async function saveBlobFileWithDialog(
  filename: string,
  blob: Blob,
  acceptType?: PickerAcceptType
): Promise<void> {
  const handle = await pickSaveFileHandle(filename, acceptType);
  if (!handle) {
    if (!isSavePickerSupported()) {
      downloadBlobFile(filename, blob);
    }
    return;
  }

  try {
    await writeBlobToFileHandle(handle, blob);
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }
    throw error;
  }
}

export async function saveTextFileWithDialog(
  filename: string,
  content: string,
  acceptType?: PickerAcceptType
): Promise<void> {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  await saveBlobFileWithDialog(filename, blob, acceptType);
}
