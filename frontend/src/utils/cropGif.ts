import gifsicle from "gifsicle-wasm-browser";

const MAX_GIF_OUTPUT_SIZE = 4 * 1024 * 1024;
export interface GifCropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export async function cropGif(
    file: File,
    crop: GifCropArea
): Promise<File> {
    const inputName = "input.gif";
    const outputName = "cropped.gif";

    const command = `
    --crop ${crop.x},${crop.y}+${crop.width}x${crop.height}
    -O2
    ${inputName}
    -o /out/${outputName}
  `;

    const outputFiles = await gifsicle.run({
        input: [
            {
                file,
                name: inputName,
            },
        ],
        command: [command],
    });

    if (!outputFiles || outputFiles.length === 0) {
        throw new Error("Gifsicle failed to produce a cropped GIF");
    }

    const output = outputFiles[0];

    if (!output) {
        throw new Error("Gifsicle failed to produce a cropped GIF");
    }

    if (output.size > MAX_GIF_OUTPUT_SIZE) {
        throw new Error(
            "The cropped GIF is still too large. Please choose a smaller or shorter GIF."
        );
    }

    return output;
}