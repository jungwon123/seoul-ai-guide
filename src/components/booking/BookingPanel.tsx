

import { Ticket, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import bookingsData from '@/mocks/bookings.json';
import type { Booking } from '@/types';
import EmptyState from '@/components/ui/EmptyState';

const bookings = bookingsData as Booking[];

const statusConfig = {
  pending: { label: '진행 중', color: '#EA580C', icon: Clock },
  confirmed: { label: '예약 확정', color: '#059669', icon: CheckCircle },
  cancelled: { label: '취소됨', color: '#DC2626', icon: AlertCircle },
};

export default function BookingPanel() {
  if (bookings.length === 0) {
    return <EmptyState icon={Ticket} title="예약 없음" description="에이전트에게 예약을 요청해보세요" />;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {bookings.map((booking) => {
        const status = statusConfig[booking.status];
        const StatusIcon = status.icon;
        return (
          <div key={booking.id} className="bg-bg-surface border border-border rounded-2xl p-4 animate-fade-up hover:shadow-md hover:border-border-strong transition-all duration-200">
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
              <div className="flex justify-between"><span className="text-text-muted">날짜</span><span className="text-text-primary font-medium">{booking.date}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">시간</span><span className="text-text-primary font-medium">{booking.time}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">인원</span><span className="text-text-primary font-medium">{booking.partySize}명</span></div>
              <div className="flex justify-between"><span className="text-text-muted">확인번호</span><span className="text-text-muted font-mono text-[11px]">{booking.confirmationNumber}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
