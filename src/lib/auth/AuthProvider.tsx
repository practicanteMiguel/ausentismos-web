"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AuthClaims } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  claims: AuthClaims | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  claims: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setClaims({
          role: tokenResult.claims.role as AuthClaims["role"],
          contractId: (tokenResult.claims.contractId as string) ?? null,
          fieldId: (tokenResult.claims.fieldId as string) ?? null,
          supervisorId: (tokenResult.claims.supervisorId as string) ?? null,
        });
      } else {
        setClaims(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await firebaseSignOut(getFirebaseAuth());
    toast.success("Sesión cerrada correctamente");
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, claims, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
