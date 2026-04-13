import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_NAME_KEY = "@goflo/user_name";

export function useUserName() {
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

  return { name, setName, isLoading };
}
