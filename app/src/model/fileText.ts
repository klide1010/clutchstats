/** Legge un File come testo con FileReader (Blob.text() richiede Chrome 76). */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error ?? new Error('Lettura file fallita'));
    r.readAsText(file);
  });
}
