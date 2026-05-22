import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
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
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch profile
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          // Use onSnapshot to keep profile in sync
          const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            const masterAdminEmail = "cfo.moaz@gmail.com";
            const isMasterAdmin = firebaseUser.email === masterAdminEmail;

            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              
              // If it's the master admin but doesn't have admin flag, update it
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
              // Check if this is the master admin email
              const isMasterAdmin = firebaseUser.email === masterAdminEmail;

              // Create default profile for first time user
              const defaultProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'مستخدم جديد',
                isAdmin: isMasterAdmin, // Set to true if master admin
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
          });

          return () => {
            unsubscribeProfile();
          };
        } catch (error) {
          console.error("Profile fetch error:", error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
