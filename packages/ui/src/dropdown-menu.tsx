"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@repo/shared";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closeMenu: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  itemsRef: RefObject<HTMLElement[]>;
  pendingFocusRef: RefObject<"first" | "last" | null>;
  registerItem: (element: HTMLElement) => () => void;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu(): DropdownMenuContextValue {
  const context = useContext(DropdownMenuContext);
  if (context === null) {
    throw new Error("Dropdown menu parts must be rendered inside <DropdownMenu>.");
  }
  return context;
}

function focusItem(items: HTMLElement[], position: "first" | "last") {
  const item = position === "first" ? items[0] : items[items.length - 1];
  item?.focus();
}

type DropdownMenuProps = { children: ReactNode };

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<HTMLElement[]>([]);
  const pendingFocusRef = useRef<"first" | "last" | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const registerItem = useCallback((element: HTMLElement) => {
    itemsRef.current = [...itemsRef.current, element];
    return () => {
      itemsRef.current = itemsRef.current.filter((item) => item !== element);
    };
  }, []);

  // Outside presses close the menu without pulling focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <DropdownMenuContext.Provider
      value={{
        open,
        setOpen,
        closeMenu,
        triggerRef,
        rootRef,
        itemsRef,
        pendingFocusRef,
        registerItem,
      }}
    >
      <div ref={rootRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

type DropdownMenuTriggerProps = { asChild?: boolean; children: ReactNode };

function DropdownMenuTrigger({ asChild = false, children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef, itemsRef, pendingFocusRef } = useDropdownMenu();

  function onClick(event: MouseEvent<HTMLElement>) {
    // Rows and cards underneath often open on click; the trigger must not bubble.
    event.stopPropagation();
    setOpen(!open);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) {
      pendingFocusRef.current = event.key === "ArrowDown" ? "first" : "last";
      setOpen(true);
      return;
    }
    focusItem(itemsRef.current, event.key === "ArrowDown" ? "first" : "last");
  }

  const triggerProps = {
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    onClick,
    onKeyDown,
  };

  if (asChild) {
    return (
      <Slot ref={triggerRef} {...triggerProps}>
        {children}
      </Slot>
    );
  }

  return (
    <button ref={triggerRef} type="button" {...triggerProps}>
      {children}
    </button>
  );
}

type DropdownMenuContentProps = { align?: "start" | "end"; children: ReactNode };

function DropdownMenuContent({ align = "end", children }: DropdownMenuContentProps) {
  const { open, closeMenu, itemsRef, pendingFocusRef } = useDropdownMenu();

  useEffect(() => {
    if (!open) return;
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    focusItem(itemsRef.current, pending);
  }, [open, itemsRef, pendingFocusRef]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = itemsRef.current;
    if (items.length === 0) return;
    const current = items.findIndex((item) => item === document.activeElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next =
      current === -1
        ? delta === 1
          ? 0
          : items.length - 1
        : (current + delta + items.length) % items.length;
    items[next]?.focus();
  }

  if (!open) return null;

  return (
    <div
      role="menu"
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "absolute top-full z-50 mt-1 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        align === "start" ? "left-0" : "right-0",
      )}
    >
      {children}
    </div>
  );
}

type DropdownMenuItemProps = {
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

function DropdownMenuItem({
  onSelect,
  destructive = false,
  disabled = false,
  icon,
  children,
}: DropdownMenuItemProps) {
  const { closeMenu, registerItem } = useDropdownMenu();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (disabled || element === null) return;
    return registerItem(element);
  }, [disabled, registerItem]);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled) return;
        onSelect();
        closeMenu();
      }}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        destructive && "text-destructive",
      )}
    >
      {icon ? <span className="shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

function DropdownMenuSeparator() {
  return <div role="separator" className="-mx-1 my-1 h-px bg-border" />;
}

function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{children}</div>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
};
