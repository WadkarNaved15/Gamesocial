import GameFeedbackPanel from "./GameFeedbackModal";
import StreamFeedbackPanel from "./StreamFeedback";

interface Props {
    open: boolean;
    onClose: () => void;
    gameName: string;
    steamUrl?: string | null;
    playTimeMs: number;
}

export default function GameSessionFeedbackModal({
    open,
    onClose,
    gameName,
    steamUrl,
    playTimeMs,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-6">

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                <StreamFeedbackPanel />

                <GameFeedbackPanel
                    onClose={onClose}
                    gameName={gameName}
                    steamUrl={steamUrl}
                    playTimeMs={playTimeMs}
                />

            </div>

        </div>
    );
}