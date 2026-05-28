import { Truck, Car, FileText, ShoppingBag, Wrench, HardHat, MapPin, HelpCircle } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Truck,
  Car,
  FileText,
  ShoppingBag,
  Wrench,
  HardHat,
  MapPin,
};

interface CategoryIconProps {
  iconName: string;
  className?: string;
}

export function CategoryIcon({ iconName, className = "w-5 h-5" }: CategoryIconProps) {
  const Icon = iconMap[iconName] ?? HelpCircle;
  return <Icon className={className} />;
}
