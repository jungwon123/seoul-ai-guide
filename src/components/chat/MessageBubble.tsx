'use client';

import type { Message } from '@/types';
import { AGENT_COLORS } from '@/lib/utils';
import PlaceCarousel from './PlaceCarousel';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agentColor = message.agent ? AGENT_COLORS[message.agent] : '#7C3AED';

  return (
    <div className="animate-message">
      {isUser ? (
        <div className="flex justify-end pl-12">
          <div className="bg-brand-subtle border border-brand/[0.08] rounded-[16px] rounded-br-[4px] px-3.5 py-2.5 text-[14px] leading-[1.6] text-text-primary">
            {message.text}
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5 pr-4">
          <div
            className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5"
            style={{ backgroundColor: `${agentColor}08`, color: agentColor, border: `1px solid ${agentColor}15` }}
          >
            {message.agent?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-[14px] leading-[1.7] text-text-primary">
              {message.text}
            </div>

            {/* Place carousel */}
            {message.places && message.places.length > 0 && (
              <PlaceCarousel places={message.places} />
            )}

            {message.itinerary && <ItineraryCard itinerary={message.itinerary} />}
            {message.booking && <BookingCard booking={message.booking} />}
          </div>
        </div>
      )}
    </div>
  );
}
