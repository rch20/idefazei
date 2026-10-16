/** Dados técnicos de criação local; não contém credenciais ou anotações de alunos. */
export const FOUNDATION_CREATION_DATABASE_NAME =
  "idefazei-foundation-creation-outbox";

/** Remove os snapshots locais no logout mesmo se o editor foi desmontado. */
export async function clearFoundationCreationLocalDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(FOUNDATION_CREATION_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new Error("Não foi possível limpar o armazenamento local de criação.")
      );
    request.onblocked = () =>
      reject(
        new Error("O armazenamento local de criação está ocupado em outra aba.")
      );
  });
}
