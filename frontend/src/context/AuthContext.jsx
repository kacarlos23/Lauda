/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
} from "../lib/session";

const AuthContext = createContext(null);

function areUsersEqual(currentUser, nextUser) {
  if (currentUser === nextUser) {
    return true;
  }

  if (!currentUser || !nextUser) {
    return false;
  }

  const keys = new Set([...Object.keys(currentUser), ...Object.keys(nextUser)]);
  for (const key of keys) {
    if (currentUser[key] !== nextUser[key]) {
      return false;
    }
  }

  return true;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());

  const login = useCallback((nextSession) => {
    persistSession(nextSession);
    setSession(nextSession);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const mergedUser = {
        ...currentSession.user,
        ...nextUser,
      };

      if (areUsersEqual(currentSession.user, mergedUser)) {
        return currentSession;
      }

      const nextSession = {
        ...currentSession,
        user: mergedUser,
      };
      persistSession(nextSession);
      return nextSession;
    });
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      token: session?.access || null,
      user: session?.user || null,
      login,
      updateUser,
      logout,
    }),
    [login, logout, session, updateUser],
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
