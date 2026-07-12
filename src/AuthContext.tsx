import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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
    canDelete: boolean;
  };
}

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

    const savedUid = localStorage.getItem('custom_uid');
    const savedPassword = localStorage.getItem('custom_password');

    const setupCustomSession = async (uid: string, psw: string) => {
      try {
        const userDocRef = doc(db, 'users', uid.toLowerCase().trim());
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (data.password === psw) {
            setUser({
              uid: data.uid,
              email: data.email || data.uid,
              displayName: data.name
            });
            setProfile(data);

            // Subscribe to real-time changes
            unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                setProfile(snap.data() as UserProfile);
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
      localStorage.removeItem('custom_uid');
      localStorage.removeItem('custom_password');
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

                if (isMasterAdmin && !data.isAdmin) {
                  const updatedProfile = {
                    ...data,
                    isAdmin: true,
                    permissions: Object.keys(data.permissions).reduce((acc, key) => ({
                      ...acc,
                      [key]: true
                    }), {} as UserProfile['permissions'])
                  };
                  setDoc(userDocRef, updatedProfile);
                  setProfile(updatedProfile);
                } else {
                  setProfile(data);
                }
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
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const loginWithEmailOrPhone = async (identifier: string, psw: string) => {
    setLoading(true);
    try {
      const uid = identifier.toLowerCase().trim();
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        throw new Error('المستخدم غير مسجل في النظام. يرجى التواصل مع الإدارة.');
      }

      const data = docSnap.data() as UserProfile;
      if (!data.password) {
        throw new Error('هذا الحساب مهيأ لتسجيل الدخول باستخدام جوجل فقط.');
      }

      if (data.password !== psw) {
        throw new Error('كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
      }

      // Set credentials to localStorage
      localStorage.setItem('custom_uid', data.uid);
      localStorage.setItem('custom_password', psw);

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
    localStorage.removeItem('custom_uid');
    localStorage.removeItem('custom_password');
    setUser(null);
    setProfile(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithEmailOrPhone, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
