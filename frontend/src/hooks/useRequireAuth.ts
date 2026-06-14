import { useUser } from "../context/user";
import { useAuthGate } from "../context/AuthGate";

export function useRequireAuth() {
  const { user } = useUser();
  const { openGate } = useAuthGate();

  const requireAuth = (
    callback?: () => void,
    message = "Create an account to continue."
  ) => {
    if (!user) {
      openGate(message);
      return false;
    }

    callback?.();
    return true;
  };

  return requireAuth;
}