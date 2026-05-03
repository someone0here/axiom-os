declare global {
  interface Window {
    axiom: {
      authNeedsSetup: () => Promise<{ needsSetup: boolean }>;
      authSetup: (password: string) => Promise<{ success: boolean }>;
      authLogin: (
        profileId: number,
        password: string,
      ) => Promise<{ success: boolean; error?: string }>;
      authLogout: () => Promise<{ success: boolean }>;
      profilesList: () => Promise<
        Array<{ id: number; label: string; isDecoy: boolean }>
      >;
      profilesCreate: (
        name: string,
        password: string,
        isDecoy?: boolean,
      ) => Promise<any>;
      profilesLock: () => Promise<any>;
      profilesDelete: (id: number, password: string) => Promise<any>;
      notesList: () => Promise<any[]>;
      notesSave: (
        note: any,
      ) => Promise<{ success: boolean; id?: number; error?: string }>;
      notesDelete: (id: number) => Promise<any>;
      vaultList: () => Promise<any[]>;
      vaultSave: (
        entry: any,
      ) => Promise<{ success: boolean; id?: number; error?: string }>;
      vaultDelete: (id: number) => Promise<any>;
      filesList: (folder: string) => Promise<any[]>;
      filesUpload: (
        buffer: ArrayBuffer,
        name: string,
        folder: string,
      ) => Promise<any>;
      filesRead: (id: number) => Promise<any>;
      filesDelete: (id: number) => Promise<any>;
      settingsGet: (key: string) => Promise<string | null>;
      settingsSet: (key: string, value: any) => Promise<any>;
      snapshotsCreate: (label: string) => Promise<any>;
      snapshotsList: () => Promise<any[]>;
      snapshotsRestore: (id: number) => Promise<any>;
      snapshotsDelete: (id: number) => Promise<any>;
      syncExport: () => Promise<any>;
      syncImport: () => Promise<any>;
      winMinimize: () => void;
      winMaximize: () => void;
      winClose: () => void;
      onForceLock: (cb: () => void) => void;
    };
  }
}
export {};
