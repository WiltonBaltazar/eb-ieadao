import { Card, CardContent } from '@/Components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind color token for the top border and icon bg, e.g. "brand-primary" */
  color: string;
  /** Override the value text color, defaults to slate-800 */
  valueColor?: string;
  /** Override icon color inside the colored box, defaults to white */
  iconColor?: string;
}

export default function KpiCard({ label, value, icon: Icon, color, valueColor = 'text-slate-800', iconColor = 'text-white' }: KpiCardProps) {
  return (
    <Card className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-slate-200/70 border-t-[3px] border-t-${color} overflow-hidden`}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`text-3xl font-bold mt-1.5 tracking-tight ${valueColor}`}>{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg bg-${color} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
