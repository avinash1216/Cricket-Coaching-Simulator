"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, onAuthStateChanged, type User } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userId: string;
  userName: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userId: "anonymous",
  userName: "Anonymous",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const userId = user?.uid || "anonymous";
  const userName = user?.displayName || "Anonymous";

  return (
    <AuthContext.Provider value={{ user, loading, userId, userName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
