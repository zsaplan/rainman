type PiSdkModule = typeof import("@mariozechner/pi-coding-agent");

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<PiSdkModule>;

export async function loadPiSdk(): Promise<PiSdkModule> {
  return dynamicImport("@mariozechner/pi-coding-agent");
}
