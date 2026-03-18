"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface HeaderPageContextType {
  title: string;
  setTitle: (title: string) => void;
  filterSlot: ReactNode | null;
  setFilterSlot: (slot: ReactNode | null) => void;
}

const HeaderPageContext = createContext<HeaderPageContextType>({
  title: "",
  setTitle: () => {},
  filterSlot: null,
  setFilterSlot: () => {},
});

export function useHeaderPage() {
  return useContext(HeaderPageContext);
}

export function HeaderPageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const [filterSlot, setFilterSlot] = useState<ReactNode | null>(null);

  return (
    <HeaderPageContext.Provider
      value={{ title, setTitle, filterSlot, setFilterSlot }}
    >
      {children}
    </HeaderPageContext.Provider>
  );
}
