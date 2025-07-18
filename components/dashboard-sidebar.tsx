'use client'

import { useUser } from "@clerk/nextjs"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { 
  LogOut,
  User
} from "lucide-react"
import { navigationItems, settingsItems } from "@/lib/options/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

export function DashboardSidebar() {
  const { user, signOut } = useUser()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const handleSignOut = () => {
    signOut()
  }

  const navigationItemsWithActive = navigationItems.map(item => ({
    ...item,
    isActive: pathname === item.href
  }))

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold">IM</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">Dashboard</span>
              <span className="truncate text-xs">Admin Panel</span>
            </div>
          </div>
        </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItemsWithActive.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {isMobile ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild size="lg" isActive={item.isActive}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild size="lg" isActive={item.isActive}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {isMobile ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild size="lg" isActive={pathname === item.href}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild size="lg" isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
              <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-2">
            {isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-left">
                    <div className="font-semibold">{user?.fullName}</div>
                    <div className="text-xs">{user?.emailAddresses[0]?.emailAddress}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{user?.fullName}</span>
              <span className="truncate text-xs">{user?.emailAddresses[0]?.emailAddress}</span>
            </div>
            {isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
} 