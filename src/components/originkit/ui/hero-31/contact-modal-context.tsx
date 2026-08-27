"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ContactModalContextValue = {
  isOpen: boolean;
  prefillEmail: string;
  openModal: (prefillEmail?: string) => void;
  closeModal: () => void;
};

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

// Provider bọc quanh cả Navbar lẫn EmailCapture (2 nhánh component tách
// biệt trong SectionHero) — cho phép cả 2 nơi cùng mở chung 1 modal mà
// không cần "kéo" state qua nhiều tầng props.
export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");

  const openModal = (email?: string) => {
    setPrefillEmail(email ?? "");
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  return (
    <ContactModalContext.Provider value={{ isOpen, prefillEmail, openModal, closeModal }}>
      {children}
    </ContactModalContext.Provider>
  );
}

export function useContactModal() {
  const ctx = useContext(ContactModalContext);
  if (!ctx) {
    throw new Error("useContactModal phải được gọi bên trong ContactModalProvider");
  }
  return ctx;
}
