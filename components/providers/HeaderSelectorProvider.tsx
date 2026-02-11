"use client";

import React, { createContext, useContext, useState } from "react";

interface HeaderSelectorContextType {
  value: string;
  setValue: (value: string) => void;
}

const HeaderSelectorContext = createContext<HeaderSelectorContextType>({
  value: "",
  setValue: () => {},
});

export function useHeaderSelector() {
  return useContext(HeaderSelectorContext);
}

export function HeaderSelectorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [value, setValue] = useState("");

  return (
    <HeaderSelectorContext.Provider value={{ value, setValue }}>
      {children}
    </HeaderSelectorContext.Provider>
  );
}
