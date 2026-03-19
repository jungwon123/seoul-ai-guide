'use client';

import type { Message } from '@/types';
import { AGENT_CONFIG, cn } from '@/lib/utils';
import PlaceCard from './PlaceCard';
import ItineraryCard from './ItineraryCard';
import BookingCard from './BookingCard';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const agentConfig = message.agent ? AGENT_CONFIG[message.agent] : null;

  return (
    <div
      className={cn(
        'flex gap-3 animate-message-in',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      {!isUser && agentConfig && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{
            backgroundColor: `${agentConfig.color}30`,
            border: `1px solid ${agentConfig.color}50`,
            boxShadow: `0 0 10px ${agentConfig.glowColor}`,
            fontFamily: 'var(--font-display)',
          }}
        >
          {agentConfig.label[0]}
        </div>
      )}

      {/* Bubble */}
      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'px-[18px] py-[14px] text-sm leading-relaxed',
            isUser
              ? 'rounded-2xl rounded-tr-none ml-auto'
              : 'rounded-2xl rounded-tl-none',
          )}
          style={isUser ? {
            background: 'linear-gradient(135deg, rgba(0,255,178,0.1), rgba(0,212,255,0.05))',
            border: '1px solid rgba(0,255,178,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          } : {
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderLeft: `2px solid ${agentConfig?.color || '#9B6DFF'}`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.3), -4px 0 16px ${agentConfig?.glowColor || 'rgba(155,109,255,0.08)'}`,
          }}
        >
          {message.text}
        </div>

        {message.places && message.places.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}

        {message.itinerary && <ItineraryCard itinerary={message.itinerary} />}
        {message.booking && <BookingCard booking={message.booking} />}
      </div>
    </div>
  );
}
