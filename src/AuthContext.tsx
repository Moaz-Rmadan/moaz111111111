import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';
import { UserRole, UserPermissions } from './core/types';
import { ROLE_PERMISSIONS } from './core/permissions';

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
  role: UserRole;
  isAdmin: boolean;
  permissions: UserPermissions;
  status?: 'active' | 'disabled';
  disabled?: boolean;
  authMigrated?: boolean;
  authUid?: string;
  authProvider?: 'google' | 'firebase_email' | 'local_bridge';
  migratedAt?: string;
  createdAt?: string;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
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
  const role: UserRole = isMasterAdmin
    ? 'super_admin'
    : (data.role || (data.isAdmin ? 'admin' : 'worker'));

  const isAdmin = role === 'super_admin' || role === 'admin' || !!data.isAdmin || isMasterAdmin;
  const roleBasePermissions = ROLE_PERMISSIONS[role] || DEFAULT_PERMISSIONS;

  const mergedPermissions: UserPermissions = {
    ...roleBasePermissions,
    ...(data.permissions || {})
  };

  if (isAdmin) {
    Object.keys(mergedPermissions).forEach(key => {
      (mergedPermissions as any)[key] = true;
    });
  }

  const isActive = data.status ? data.status === 'active' : (data.disabled !== true);

  return {
    ...data,
    role,
    isAdmin,
    status: isActive ? 'active' : 'disabled',
    disabled: !isActive,
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
    }, 4000);

    const savedUid = safeStorage.getItem('custom_uid');
    const savedPassword = safeStorage.getItem('custom_password');

    const setupCustomSession = async (uidInput: string, psw: string) => {
      try {
        const cleanUid = uidInput.toLowerCase().trim();
        const cleanPsw = psw.trim();
        
        let userDocRef = doc(db, 'users', cleanUid);
        let docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          // Check if custom_uid was an email
          const emailDocRef = doc(db, 'users', cleanUid);
          docSnap = await getDoc(emailDocRef);
        }

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Enforce active account status
          if (data.status === 'disabled' || data.disabled === true) {
            safeStorage.removeItem('custom_uid');
            safeStorage.removeItem('custom_password');
            return false;
          }

          if (data.password?.trim() === cleanPsw) {
            const isMasterAdmin = data.email === "cfo.moaz@gmail.com";
            const normalized = normalizeProfile(data, isMasterAdmin);
            setUser({
              uid: normalized.uid || cleanUid,
              email: normalized.email || cleanUid,
              displayName: normalized.name
            });
            setProfile(normalized);

            // Subscribe to real-time changes
            unsubscribeProfile = onSnapshot(doc(db, 'users', normalized.uid || cleanUid), (snap) => {
              if (snap.exists()) {
                const updated = snap.data();
                if (updated.status === 'disabled' || updated.disabled === true) {
                  // User got disabled during active session
                  logout();
                  return;
                }
                setProfile(normalizeProfile(updated, isMasterAdmin));
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

      // Standard Firebase Auth
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const uid = firebaseUser.uid;
            const masterAdminEmail = "cfo.moaz@gmail.com";
            const isMasterAdmin = firebaseUser.email === masterAdminEmail;

            const uidDocRef = doc(db, 'users', uid);
            let docSnap = await getDoc(uidDocRef);

            // Legacy lookup fallback by email
            if (!docSnap.exists() && firebaseUser.email) {
              const emailDocRef = doc(db, 'users', firebaseUser.email.toLowerCase());
              const emailDocSnap = await getDoc(emailDocRef);
              if (emailDocSnap.exists()) {
                const legacyData = emailDocSnap.data();
                const migratedProfile = {
                  ...legacyData,
                  uid,
                  email: firebaseUser.email,
                  authMigrated: true,
                  authUid: uid,
                  authProvider: firebaseUser.providerData?.[0]?.providerId || 'google',
                  migratedAt: new Date().toISOString()
                };
                await setDoc(uidDocRef, migratedProfile);
                docSnap = await getDoc(uidDocRef);
              }
            }

            if (!docSnap.exists()) {
              const initialRole: UserRole = isMasterAdmin ? 'super_admin' : 'worker';
              const roleBasePerms = ROLE_PERMISSIONS[initialRole] || DEFAULT_PERMISSIONS;

              const defaultProfile: UserProfile = {
                uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'مستخدم جديد',
                role: initialRole,
                isAdmin: isMasterAdmin,
                status: 'active',
                disabled: false,
                authMigrated: true,
                authUid: uid,
                authProvider: 'google',
                permissions: {
                  ...roleBasePerms,
                  dashboard: true,
                }
              };
              await setDoc(uidDocRef, defaultProfile);
            }

            unsubscribeProfile = onSnapshot(uidDocRef, (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'disabled' || data.disabled === true) {
                  // User disabled by admin
                  logout();
                  return;
                }
                const normalized = normalizeProfile(data, isMasterAdmin);
                if (isMasterAdmin && normalized.role !== 'super_admin') {
                  setDoc(uidDocRef, { ...normalized, role: 'super_admin', isAdmin: true });
                }
                setProfile(normalized);
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
      const cleanIdentifier = identifier.toLowerCase().trim();
      const cleanPsw = psw.trim();
      
      if (!cleanIdentifier || !cleanPsw) {
        throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور.');
      }

      // Step 1: Check if identifier can authenticate directly via Firebase Auth (Email/Password)
      let firebaseAuthSuccess = false;
      if (cleanIdentifier.includes('@')) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, cleanIdentifier, cleanPsw);
          if (userCred.user) {
            firebaseAuthSuccess = true;
            // Clear any old local custom credentials since user is fully on Firebase Auth
            safeStorage.removeItem('custom_uid');
            safeStorage.removeItem('custom_password');
            return;
          }
        } catch (authErr: any) {
          // If password wrong on existing Firebase Auth user, re-throw correct message
          if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
            // Check if user exists in Firestore to distinguish from non-migrated accounts
            const directDoc = await getDoc(doc(db, 'users', cleanIdentifier));
            if (directDoc.exists() && directDoc.data().authMigrated) {
              throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من حالة الأحرف ولغة الإدخال.');
            }
          }
          // Continue to fallback hybrid check below
        }
      }

      // Step 2: Fallback to Firestore Document Check (Safe Migration Bridge)
      let userDocRef = doc(db, 'users', cleanIdentifier);
      let docSnap = await getDoc(userDocRef);

      // If not found by ID, query by email or phone
      if (!docSnap.exists()) {
        const emailQuery = query(collection(db, 'users'), where('email', '==', cleanIdentifier));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          docSnap = emailSnap.docs[0];
          userDocRef = docSnap.ref;
        } else {
          const phoneQuery = query(collection(db, 'users'), where('phone', '==', cleanIdentifier));
          const phoneSnap = await getDocs(phoneQuery);
          if (!phoneSnap.empty) {
            docSnap = phoneSnap.docs[0];
            userDocRef = docSnap.ref;
          }
        }
      }

      if (!docSnap.exists()) {
        throw new Error('المستخدم غير مسجل في النظام. يرجى التأكد من كتابة البريد أو الرقم بشكل صحيح.');
      }

      const data = docSnap.data();

      // Check account active status
      if (data.status === 'disabled' || data.disabled === true) {
        throw new Error('تم تعطيل هذا الحساب من قبل إدارة النظام. يرجى التواصل مع المسؤول.');
      }

      if (!data.password) {
        throw new Error('هذا الحساب مهيأ لتسجيل الدخول باستخدام جوجل فقط.');
      }

      if (data.password.trim() !== cleanPsw) {
        throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من لغة لوحة المفاتيح وحالة الأحرف.');
      }

      // Step 3: Seamless Background Migration to Firebase Auth if eligible
      const isMasterAdmin = data.email === "cfo.moaz@gmail.com";
      const normalized = normalizeProfile(data, isMasterAdmin);

      if (cleanIdentifier.includes('@') && cleanPsw.length >= 6 && !data.authMigrated) {
        try {
          const newAuthUser = await createUserWithEmailAndPassword(auth, cleanIdentifier, cleanPsw);
          if (newAuthUser.user) {
            if (normalized.name) {
              await firebaseUpdateProfile(newAuthUser.user, { displayName: normalized.name });
            }
            // Tag document as migrated
            await updateDoc(userDocRef, {
              authMigrated: true,
              authUid: newAuthUser.user.uid,
              authProvider: 'firebase_email',
              migratedAt: new Date().toISOString()
            });
            // Successfully migrated and signed in via Firebase Auth!
            safeStorage.removeItem('custom_uid');
            safeStorage.removeItem('custom_password');
            return;
          }
        } catch (migErr: any) {
          // If already exists in Firebase Auth, attempt signing in
          if (migErr.code === 'auth/email-already-in-use') {
            try {
              await signInWithEmailAndPassword(auth, cleanIdentifier, cleanPsw);
              await updateDoc(userDocRef, {
                authMigrated: true,
                authProvider: 'firebase_email',
                migratedAt: new Date().toISOString()
              });
              safeStorage.removeItem('custom_uid');
              safeStorage.removeItem('custom_password');
              return;
            } catch (ignore) {
              // Fall back to local bridge session below
            }
          }
          console.warn("Background auth migration deferred, using secure local bridge:", migErr);
        }
      }

      // Step 4: Establish Local Bridge Session (Zero Disruption)
      safeStorage.setItem('custom_uid', normalized.uid || cleanIdentifier);
      safeStorage.setItem('custom_password', cleanPsw);

      setUser({
        uid: normalized.uid || cleanIdentifier,
        email: normalized.email || cleanIdentifier,
        displayName: normalized.name
      });
      setProfile(normalized);
    } catch (err: any) {
      console.error("Authentication bridge error:", err);
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
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
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
