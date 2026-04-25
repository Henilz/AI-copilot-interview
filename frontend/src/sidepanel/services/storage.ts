export const storage = {
  get: <T>(key: string): Promise<T | null> =>
    new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key] ?? null))
    }),

  set: <T>(key: string, value: T): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    }),

  remove: (key: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve)
    }),
}
