import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
}

export function Modal({ open, title, children, onClose, showCloseButton = true }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {showCloseButton ? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
