"use client"

import { Suspense } from "react"
import { GraduationCap, CheckSquare, MessageSquare, BookOpen, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent as UISidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const items = [
  {
    title: "Skills",
    url: "/dashboard",
    icon: GraduationCap,
  },
  {
    title: "Theory",
    url: "/dashboard/theory",
    icon: BookOpen,
  },
  {
    title: "Tasks",
    url: "/dashboard/courses",
    icon: CheckSquare,
  },
  {
    title: "Conversations",
    url: "/dashboard/conversations",
    icon: MessageSquare,
  },
]

function CustomSidebarContent() {
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Sidebar>
      <UISidebarContent>
        <div className="mb-8 px-3">
          <h2 className="text-2xl font-bold text-slate-900">Willow</h2>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link href={item.url} passHref legacyBehavior>
                    <SidebarMenuButton asChild>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </UISidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut(() => router.push("/"))}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function AppSidebar() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomSidebarContent />
    </Suspense>
  )
} 