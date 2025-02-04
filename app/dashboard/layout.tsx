"use client"

import React from 'react'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <div className="bg-background">
          <SidebarProvider>
            <AppSidebar />
            <main className="flex p-4 sm:ml-64">
              <div className="flex-1">
                <div className="mb-4 sm:hidden">
                  <SidebarTrigger />
                </div>
                {children}
              </div>
            </main>
          </SidebarProvider>
        </div>
      </div>
    </div>
  );
}