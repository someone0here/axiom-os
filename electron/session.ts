// electron/session.ts
export interface Session {
  key: Buffer | null;
  profileId: number | null;
}

// Single shared object — passed by reference to all handlers
export const session: Session = {
  key: null,
  profileId: null,
};

export function clearSession(s: Session): void {
  if (s.key) {
    s.key.fill(0);
    s.key = null;
  }
  s.profileId = null;
}
