'use client';

import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Booking } from '@/types';

const statusConfig = {
  pending: { label: '진행 중', color: '#EA580C', icon: Clock },
  confirmed: { label: '예약 확정', color: '#059669', icon: CheckCircle },
  cancelled: { label: '취소됨', color: '#DC2626', icon: AlertCircle },
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[14px] font-semibold text-text-primary tracking-[-0.02em]">{booking.placeName}</h4>
        <span
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${status.color}0A`, color: status.color }}
        >
          <StatusIcon size={11} />
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <div className="flex justify-between">
          <span className="text-text-muted">날짜</span>
          <span className="text-text-primary font-medium">{booking.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">시간</span>
          <span className="text-text-primary font-medium">{booking.time}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">인원</span>
          <span className="text-text-primary font-medium">{booking.partySize}명</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">확인번호</span>
          <span className="text-text-muted font-mono text-[11px]">{booking.confirmationNumber}</span>
        </div>
      </div>
    </div>
  );
}
