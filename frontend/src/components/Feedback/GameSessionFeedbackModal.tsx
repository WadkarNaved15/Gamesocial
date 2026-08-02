import GameFeedbackModal from "../Home/GameFeedbackModal";

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
    return (
        <GameFeedbackModal
            open={open}
            onClose={onClose}
            gameName={gameName}
            steamUrl={steamUrl}
            playTimeMs={playTimeMs}
        />
    );
}