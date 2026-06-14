import { createContext, useContext, useState } from "react";

interface AuthGateContextType {
  isOpen: boolean;
  message: string;
  openGate: (message?: string) => void;
  closeGate: () => void;
}

const AuthGateContext = createContext<AuthGateContextType>({
  isOpen: false,
  message: "",
  openGate: () => {},
  closeGate: () => {},
});

export function AuthGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const openGate = (
    text = "Create an account to continue."
  ) => {
    setMessage(text);
    setIsOpen(true);
  };

  const closeGate = () => {
    setIsOpen(false);
  };

  return (
    <AuthGateContext.Provider
      value={{
        isOpen,
        message,
        openGate,
        closeGate,
      }}
    >
      {children}
    </AuthGateContext.Provider>
  );
}

export const useAuthGate = () =>
  useContext(AuthGateContext);