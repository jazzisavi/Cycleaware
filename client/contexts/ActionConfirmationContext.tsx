import React, { createContext, useContext, useState, useCallback } from "react";

type ActionType = "taken" | "skipped" | "snoozed" | null;

interface ActionConfirmationState {
  actionType: ActionType;
  snoozeDuration?: string;
}

interface ActionConfirmationContextValue {
  state: ActionConfirmationState;
  showConfirmation: (actionType: ActionType, snoozeDuration?: string) => void;
  dismiss: () => void;
}

const ActionConfirmationContext = createContext<ActionConfirmationContextValue>({
  state: { actionType: null },
  showConfirmation: () => {},
  dismiss: () => {},
});

export function ActionConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ActionConfirmationState>({ actionType: null });

  const showConfirmation = useCallback((actionType: ActionType, snoozeDuration?: string) => {
    setState({ actionType, snoozeDuration });
  }, []);

  const dismiss = useCallback(() => {
    setState({ actionType: null });
  }, []);

  return (
    <ActionConfirmationContext.Provider value={{ state, showConfirmation, dismiss }}>
      {children}
    </ActionConfirmationContext.Provider>
  );
}

export function useActionConfirmation() {
  return useContext(ActionConfirmationContext);
}
