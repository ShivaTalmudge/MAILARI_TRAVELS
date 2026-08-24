import { cn } from '../../lib/utils';


const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Booking
  PENDING:            { label: 'Pending',            className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED:          { label: 'Confirmed',          className: 'bg-blue-50 text-blue-700 border-blue-200' },
  DRIVER_ASSIGNED:    { label: 'Driver Assigned',    className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DRIVER_ACCEPTED:    { label: 'Driver Accepted',    className: 'bg-violet-50 text-violet-700 border-violet-200' },
  DRIVER_ON_THE_WAY:  { label: 'On The Way',         className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  ARRIVED:            { label: 'Arrived',             className: 'bg-teal-50 text-teal-700 border-teal-200' },
  TRIP_STARTED:       { label: 'In Progress',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
  TRIP_COMPLETED:     { label: 'Completed',          className: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED:          { label: 'Cancelled',           className: 'bg-red-50 text-red-700 border-red-200' },
  REJECTED:           { label: 'Rejected',            className: 'bg-rose-50 text-rose-700 border-rose-200' },
  // Payment
  PAID:               { label: 'Paid',               className: 'bg-green-50 text-green-700 border-green-200' },
  PARTIALLY_PAID:     { label: 'Partial',            className: 'bg-amber-50 text-amber-700 border-amber-200' },
  FAILED:             { label: 'Failed',             className: 'bg-red-50 text-red-700 border-red-200' },
  REFUNDED:           { label: 'Refunded',           className: 'bg-purple-50 text-purple-700 border-purple-200' },
  // Driver / Vehicle / User
  AVAILABLE:          { label: 'Available',          className: 'bg-green-50 text-green-700 border-green-200' },
  ON_TRIP:            { label: 'On Trip',            className: 'bg-blue-50 text-blue-700 border-blue-200' },
  OFFLINE:            { label: 'Offline',            className: 'bg-slate-50 text-slate-600 border-slate-200' },
  SUSPENDED:          { label: 'Suspended',          className: 'bg-red-50 text-red-700 border-red-200' },
  INACTIVE:           { label: 'Inactive',           className: 'bg-slate-50 text-slate-500 border-slate-200' },
  MAINTENANCE:        { label: 'Maintenance',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
  ACTIVE:             { label: 'Active',             className: 'bg-green-50 text-green-700 border-green-200' },
  ASSIGNED:           { label: 'Assigned',           className: 'bg-blue-50 text-blue-700 border-blue-200' },
  // Support
  OPEN:               { label: 'Open',              className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS:        { label: 'In Progress',       className: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESOLVED:           { label: 'Resolved',          className: 'bg-green-50 text-green-700 border-green-200' },
  CLOSED:             { label: 'Closed',            className: 'bg-slate-50 text-slate-500 border-slate-200' },
  // Trip type
  LOCAL:              { label: 'Local',             className: 'bg-blue-50 text-blue-700 border-blue-200' },
  OUTSTATION:         { label: 'Outstation',        className: 'bg-purple-50 text-purple-700 border-purple-200' },
  AIRPORT_TRANSFER:   { label: 'Airport',           className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  ONE_WAY:            { label: 'One Way',           className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ROUND_TRIP:         { label: 'Round Trip',        className: 'bg-violet-50 text-violet-700 border-violet-200' },
  FULL_DAY_RENTAL:    { label: 'Full Day',          className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
