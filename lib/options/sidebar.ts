import { 
  Home, 
  Image as ImageIcon,
  Brain,
  Palette,
  Images,
  Settings, 
  CreditCard
} from "lucide-react"

export const navigationItems = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
  },
  {
    href: '/image-generation',
    icon: ImageIcon,
    label: 'Generate Image',
  },
  {
    href: '/models',
    icon: Brain,
    label: 'My Models',
  },
  {
    href: '/model-training',
    icon: Palette,
    label: 'Train Model',
  },
  {
    href: '/gallery',
    icon: Images,
    label: 'My Images',
  },
  {
    href: '/billing',
    icon: CreditCard,
    label: 'Billing',
  }
]

export const settingsItems = [
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  }
] 