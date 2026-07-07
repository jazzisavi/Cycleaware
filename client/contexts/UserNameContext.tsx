import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_NAME_KEY = "@goflo/user_name";

interface UserNameContextType {
  name: string;
  setName: (newName: string) => Promise<void>;
  isLoading: boolean;
}

const UserNameContext = createContext<UserNameContextType | null>(null);

export function UserNameProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY)
      .then((stored) => {
        if (stored) setNameState(stored);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setName = useCallback(async (newName: string) => {
    setNameState(newName);
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, newName);
    } catch (_e) {}
  }, []);

  return (
    <UserNameContext.Provider value={{ name, setName, isLoading }}>
      {children}
    </UserNameContext.Provider>
  );
}

export function useUserNameContext(): UserNameContextType {
  const ctx = useContext(UserNameContext);
  if (!ctx) throw new Error("useUserNameContext must be used inside UserNameProvider");
  return ctx;
}
