import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { initDB } from './database/sqlite';

export default function App() {
  useEffect(() => {
    // Initialise SQLite tables on first launch
    initDB().catch((err) => console.log('SQLite init error:', err));
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
