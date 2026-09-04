declare module "gifsicle-wasm-browser" {
  export interface GifsicleFileInput {
    file: File | Blob;
    name: string;
  }

  export interface GifsicleRunOptions {
    input: GifsicleFileInput[];
    command: string[];
  }

  /**
   * Runs the Gifsicle WASM CLI with the provided inputs and arguments.
   * @returns Array of processed output File objects.
   */
  function run(options: GifsicleRunOptions): Promise<File[]>;

  export default { run };
}