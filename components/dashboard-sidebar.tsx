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
  Home, 
  Image as ImageIcon,
  Brain,
  Palette,
  Images,
  Settings, 
  LogOut,
  User,
  CreditCard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function DashboardSidebar() {
  const { user, signOut } = useUser()
  const pathname = usePathname()

  const handleSignOut = () => {
    signOut()
  }

  const navigationItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard',
      isActive: pathname === '/dashboard'
    },
    {
      href: '/image-generation',
      icon: ImageIcon,
      label: 'Generate Image',
      isActive: pathname === '/image-generation'
    },
    {
      href: '/models',
      icon: Brain,
      label: 'My Models',
      isActive: pathname === '/models'
    },
    {
      href: '/model-training',
      icon: Palette,
      label: 'Train Model',
      isActive: pathname === '/model-training'
    },
    {
      href: '/gallery',
      icon: Images,
      label: 'My Images',
      isActive: pathname === '/gallery'
    },
    {
      href: '/billing',
      icon: CreditCard,
      label: 'Billing',
      isActive: pathname === '/billing'
    }
  ]

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
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild size="lg" isActive={pathname === '/settings'}>
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
              <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-2">
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
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{user?.fullName}</span>
              <span className="truncate text-xs">{user?.emailAddresses[0]?.emailAddress}</span>
            </div>
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
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
} 