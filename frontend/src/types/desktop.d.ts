export {};
declare global {
  interface Window {
    snapsortDesktop?: {
      platform: string;
      lightroomSetup: () => Promise<string>;
      lightroomSend: (id:string) => Promise<{id:string;launchError?:string}>;
      lightroomStatus: (id:string) => Promise<{state:string;added?:number;existing?:number;failed?:number;total?:number;catalog?:string;errors?:string[]}>;
      lightroomReveal: (id:string) => Promise<void>;
      choosePhotos: () => Promise<string[]>;
      chooseFolder: () => Promise<string | null>;
      saveReport: (report: string) => Promise<boolean>;
      onNewProject: (callback: () => void) => () => void;
      onUndoSelection: (callback: () => void) => () => void;
    };
  }
}
