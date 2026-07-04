import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

interface AccountSwitcherContextType {
  isOpen: boolean;
  anchorRect: DOMRect | null;

  openAccountSwitcher: (rect: DOMRect) => void;
  closeAccountSwitcher: () => void;
}

const AccountSwitcherContext =
  createContext<AccountSwitcherContextType | null>(null);

export function AccountSwitcherProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] =
    useState<DOMRect | null>(null);

  const openAccountSwitcher = (rect: DOMRect) => {
    setAnchorRect(rect);
    setIsOpen(true);
  };

  const closeAccountSwitcher = () => {
    setIsOpen(false);
    setAnchorRect(null);
  };

  return (
    <AccountSwitcherContext.Provider
      value={{
        isOpen,
        anchorRect,
        openAccountSwitcher,
        closeAccountSwitcher,
      }}
    >
      {children}
    </AccountSwitcherContext.Provider>
  );
}

export function useAccountSwitcherContext() {
  const ctx = useContext(AccountSwitcherContext);

  if (!ctx)
    throw new Error(
      "useAccountSwitcherContext must be inside AccountSwitcherProvider"
    );

  return ctx;
}