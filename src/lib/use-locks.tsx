import { type Accessor, createContext, createSignal, type JSX, useContext } from "solid-js";
import type { LockableParam } from "@/lib/types";

type LocksContextValue = {
  locks: Accessor<Set<LockableParam>>;
  isLocked: (param: LockableParam) => boolean;
  toggleLock: (param: LockableParam) => void;
};

const LocksContext = createContext<LocksContextValue | null>(null);

export function LocksProvider(props: { children: JSX.Element }) {
  const [locks, setLocks] = createSignal<Set<LockableParam>>(new Set());

  const isLocked = (param: LockableParam) => locks().has(param);

  const toggleLock = (param: LockableParam) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(param)) {
        next.delete(param);
      } else {
        next.add(param);
      }
      return next;
    });
  };

  return (
    <LocksContext.Provider value={{ locks, isLocked, toggleLock }}>
      {props.children}
    </LocksContext.Provider>
  );
}

export function useLocks(): LocksContextValue {
  const context = useContext(LocksContext);
  if (!context) {
    throw new Error("useLocks must be used within a LocksProvider");
  }
  return context;
}
