'use client';

import type { Booking } from '@/types';
import Badge from '@/components/ui/Badge';

const statusConfig = {
  pending: { label: '진행 중', color: '#E8700A' },
  confirmed: { label: '예약 확정', color: '#19A97B' },
  cancelled: { label: '취소됨', color: '#D9534F' },
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const status = statusConfig[booking.status];

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-3.5 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[14px] font-semibold text-text-primary">{booking.placeName}</h4>
        <Badge color={status.color}>{status.label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[12px] text-text-secondary">
        <div>{booking.date}</div>
        <div>{booking.time}</div>
        <div>{booking.partySize}명</div>
        <div className="text-text-muted">#{booking.confirmationNumber}</div>
      </div>
    </div>
  );
}
