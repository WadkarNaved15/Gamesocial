import { useEffect, useRef } from "react";
import { useUser } from "../../context/user";
import { useAuthGate } from "../../context/AuthGate";

export default function GuestProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { openGate } = useAuthGate();

  const openedRef = useRef(false);

  useEffect(() => {
    if (!user && !openedRef.current) {
      openedRef.current = true;

      openGate(
        "Create an account to access this part of Rigzer."
      );
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return children;
}