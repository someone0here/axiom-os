// electron/store.ts
// Single shared mutable object - CommonJS require() caches this,
// so every file that imports it gets the SAME instance guaranteed.

export const store = {
  key: null as Buffer | null,
  profileId: null as number | null,

  setSession(key: Buffer, profileId: number) {
    this.key = key;
    this.profileId = profileId;
  },

  clearSession() {
    if (this.key) {
      this.key.fill(0);
      this.key = null;
    }
    this.profileId = null;
  },

  isAuthenticated(): boolean {
    return this.key !== null && this.profileId !== null;
  },
};
