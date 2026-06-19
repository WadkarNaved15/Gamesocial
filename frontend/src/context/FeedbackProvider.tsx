// src/context/FeedbackProvider.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import FeedbackModal from "../components/Home/Feedback";

type FeedbackCtx = {
  open: () => void;                // normal (no screenshot)
};

const FeedbackContext = createContext<FeedbackCtx | null>(null);

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
};

export default function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);

  return (
    <FeedbackContext.Provider value={{ open }}>
      {children}

      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </FeedbackContext.Provider>
  );
}
