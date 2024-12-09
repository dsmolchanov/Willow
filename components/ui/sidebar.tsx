"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sidebarVariants = cva(
  "fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-sidebar-border bg-sidebar-background transition-transform",
  {
    variants: {
      open: {
        true: "translate-x-0",
      },
    },
  }
)

interface SidebarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => undefined,
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function Sidebar({
  className,
  open,
  ...props
}: React.HTMLAttributes<HTMLElement> & VariantProps<typeof sidebarVariants>) {
  const context = useContext(SidebarContext)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context.setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [context])

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col -translate-x-full border-r border-slate-200 bg-white transition-transform sm:translate-x-0",
        context.open && "translate-x-0",
        className
      )}
      {...props}
    />
  )
}

export function SidebarTrigger() {
  const { setOpen } = useContext(SidebarContext)

  return (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
      onClick={() => setOpen(true)}
    >
      <span className="sr-only">Open sidebar</span>
      <svg
        className="h-6 w-6"
        aria-hidden="true"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  )
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 p-4", className)} {...props} />
}

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3", className)} {...props} />
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("px-3 text-xs font-semibold uppercase text-slate-500", className)}
      {...props}
    />
  )
}

export function SidebarGroupContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-1", className)} {...props} />
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("list-none", className)} {...props} />
}

export function SidebarMenuButton({
  className,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const Comp = asChild ? 'div' : 'button'
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base font-normal text-slate-900 transition-colors hover:bg-slate-100",
        className
      )}
      {...props}
    />
  )
}

export function SidebarFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto border-t border-border px-3 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
