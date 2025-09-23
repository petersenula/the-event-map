'use client';
import { createContext, useContext } from 'react';

interface AuthContextType {
  openAuth: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  openAuth: () => {},
});

export const useAuth = () => useContext(AuthContext);
