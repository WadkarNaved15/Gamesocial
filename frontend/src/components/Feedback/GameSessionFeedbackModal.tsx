import GameFeedbackPanel from "./GameFeedbackModal";

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
            <GameFeedbackPanel
                onClose={onClose}
                gameName={gameName}
                steamUrl={steamUrl}
                playTimeMs={playTimeMs}
            />
        </div>
    );
}