/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
} from "../lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());

  const value = useMemo(
    () => ({
      session,
      token: session?.access || null,
      user: session?.user || null,
      login(nextSession) {
        persistSession(nextSession);
        setSession(nextSession);
      },
      updateUser(nextUser) {
        setSession((currentSession) => {
          if (!currentSession) {
            return currentSession;
          }

          const nextSession = {
            ...currentSession,
            user: {
              ...currentSession.user,
              ...nextUser,
            },
          };
          persistSession(nextSession);
          return nextSession;
        });
      },
      logout() {
        clearStoredSession();
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
