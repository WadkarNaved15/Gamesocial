import { useEffect, useRef } from "react";
import { useUser } from "../../context/user";
import { useAuthGate } from "../../context/AuthGate";
import { useLocation } from "react-router-dom";
import { saveRedirect } from "../../utils/authRedirect";

export default function GuestProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { openGate } = useAuthGate();
  const location = useLocation();
  const openedRef = useRef(false);

  useEffect(() => {
    if (!user && !openedRef.current) {
      openedRef.current = true;

      saveRedirect(
        location.pathname + location.search
      );
      
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