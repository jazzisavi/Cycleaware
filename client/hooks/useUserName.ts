import { useUserNameContext } from "@/contexts/UserNameContext";

export function useUserName() {
  return useUserNameContext();
}
