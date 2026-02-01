import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
      <div
        className={`p-3 rounded-full ${color || 'bg-gray-100'}`}
      >
        <Icon className="w-6 h-6 text-gray-700" />
      </div>

      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
