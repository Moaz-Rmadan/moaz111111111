import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  }
};

export interface UserProfile {
  uid: string;
  email: string;
  phone?: string;
  password?: string;
  name: string;
  isAdmin: boolean;
  permissions: {
    dashboard: boolean;
    inventory: boolean;
    production: boolean;
    maintenance: boolean;
    purchases: boolean;
    hr: boolean;
    reports: boolean;
    suppliers: boolean;
    settings: boolean;
    finance: boolean;
    sales: boolean;
    vehicles: boolean;
    canDelete: boolean;
  };
}

export const DEFAULT_PERMISSIONS = {
  dashboard: true,
  inventory: false,
  production: false,
  maintenance: false,
  purchases: false,
  hr: false,
  reports: false,
  suppliers: false,
  settings: false,
  finance: false,
  sales: false,
  vehicles: false,
  canDelete: false
};

export const normalizeProfile = (data: any, isMasterAdmin: boolean): UserProfile => {
  const isAdmin = data.isAdmin || isMasterAdmin;
  const mergedPermissions = {
    ...DEFAULT_PERMISSIONS,
    ...(data.permissions || {})
  };
  
  if (isAdmin) {
    Object.keys(mergedPermissions).forEach(key => {
      mergedPermissions[key as keyof typeof DEFAULT_PERMISSIONS] = true;
    });
  }
  
  return {
    ...data,
    isAdmin,
    permissions: mergedPermissions
  } as UserProfile;
};

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  loginWithEmailOrPhone: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginWithEmailOrPhone: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check for existing session
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const savedUid = safeStorage.getItem('custom_uid');
    const savedPassword = safeStorage.getItem('custom_password');

    const setupCustomSession = async (uid: string, psw: string) => {
      try {
        const cleanUid = uid.toLowerCase().trim();
        const cleanPsw = psw.trim();
        const userDocRef = doc(db, 'users', cleanUid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (data.password?.trim() === cleanPsw) {
            const isMasterAdmin = data.email === "cfo.moaz@gmail.com";
            const normalized = normalizeProfile(data, isMasterAdmin);
            setUser({
              uid: normalized.uid,
              email: normalized.email || normalized.uid,
              displayName: normalized.name
            });
            setProfile(normalized);

            // Subscribe to real-time changes
            unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                setProfile(normalizeProfile(snap.data() as UserProfile, isMasterAdmin));
              }
            });

            setLoading(false);
            return true;
          }
        }
      } catch (err) {
        console.error("Error setting up custom session:", err);
      }
      
      // If setup fails, clear custom storage and fallback to auth
      safeStorage.removeItem('custom_uid');
      safeStorage.removeItem('custom_password');
      return false;
    };

    const init = async () => {
      if (savedUid && savedPassword) {
        const success = await setupCustomSession(savedUid, savedPassword);
        if (success) return;
      }

      // Fallback to standard Firebase Auth
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const userId = firebaseUser.email?.toLowerCase() || firebaseUser.uid;
            const userDocRef = doc(db, 'users', userId);

            unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
              const masterAdminEmail = "cfo.moaz@gmail.com";
              const isMasterAdmin = firebaseUser.email === masterAdminEmail;

              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                const normalized = normalizeProfile(data, isMasterAdmin);

                if (isMasterAdmin && !data.isAdmin) {
                  setDoc(userDocRef, normalized);
                }
                setProfile(normalized);
              } else {
                const isMasterAdmin = firebaseUser.email === masterAdminEmail;

                const defaultProfile: UserProfile = {
                  uid: userId,
                  email: firebaseUser.email || '',
                  name: firebaseUser.displayName || 'مستخدم جديد',
                  isAdmin: isMasterAdmin,
                  permissions: {
                    dashboard: true,
                    inventory: isMasterAdmin,
                    production: isMasterAdmin,
                    maintenance: isMasterAdmin,
                    purchases: isMasterAdmin,
                    hr: isMasterAdmin,
                    reports: isMasterAdmin,
                    suppliers: isMasterAdmin,
                    settings: isMasterAdmin,
                    finance: isMasterAdmin,
                    sales: isMasterAdmin,
                    vehicles: isMasterAdmin,
                    canDelete: isMasterAdmin
                  }
                };
                setDoc(userDocRef, defaultProfile);
                setProfile(defaultProfile);
              }
              setLoading(false);
            }, (err) => {
              console.error("Error in profile onSnapshot listener:", err);
              setLoading(false);
            });
          } catch (error) {
            console.error("Profile fetch error:", error);
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      });
    };

    init();

    return () => {
      clearTimeout(safetyTimer);
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const loginWithEmailOrPhone = async (identifier: string, psw: string) => {
    setLoading(true);
    try {
      // 1. Clean and normalize inputs
      const uid = identifier.toLowerCase().trim();
      const cleanPsw = psw.trim();
      
      if (!uid || !cleanPsw) {
        throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور.');
      }

      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        throw new Error('المستخدم غير مسجل في النظام. يرجى التأكد من كتابة البريد أو الرقم بشكل صحيح.');
      }

      const data = docSnap.data() as UserProfile;
      if (!data.password) {
        throw new Error('هذا الحساب مهيأ لتسجيل الدخول باستخدام جوجل فقط.');
      }

      // 2. Strict password comparison (trimmed)
      if (data.password.trim() !== cleanPsw) {
        throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من لغة لوحة المفاتيح وحالة الأحرف.');
      }

      // Set credentials to localStorage
      safeStorage.setItem('custom_uid', data.uid);
      safeStorage.setItem('custom_password', cleanPsw);

      setUser({
        uid: data.uid,
        email: data.email || data.uid,
        displayName: data.name
      });
      setProfile(data);
    } catch (err: any) {
      console.error("Custom login error:", err);
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    safeStorage.removeItem('custom_uid');
    safeStorage.removeItem('custom_password');
    setUser(null);
    setProfile(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithEmailOrPhone, logout }}>
      {loading ? (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
          <div className="space-y-6 w-full max-w-sm p-6 bg-white rounded-[14px] shadow-sm border border-slate-100">
            <div className="w-16 h-16 rounded-[14px] bg-slate-100 animate-pulse mx-auto" />
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse mx-auto" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse mx-auto" />
            </div>
            <div className="space-y-4 pt-4">
              <div className="h-12 w-full bg-slate-100 rounded-[10px] animate-pulse" />
              <div className="h-12 w-full bg-slate-100 rounded-[10px] animate-pulse" />
              <div className="h-12 w-full bg-indigo-50 rounded-[10px] animate-pulse mt-6" />
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
