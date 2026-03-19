'use client';

import { useState } from 'react';
import type { Place } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface BookingFormProps {
  place: Place;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookingFormData) => void;
}

export interface BookingFormData {
  placeId: string;
  placeName: string;
  date: string;
  time: string;
  partySize: number;
  specialRequest: string;
}

const TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

export default function BookingForm({ place, isOpen, onClose, onSubmit }: BookingFormProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [specialRequest, setSpecialRequest] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [confirmNum, setConfirmNum] = useState('');

  const handleSubmit = () => {
    setStep('confirm');
  };

  const handleConfirm = () => {
    const num = `MOCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setConfirmNum(num);
    onSubmit({
      placeId: place.id,
      placeName: place.name,
      date,
      time,
      partySize,
      specialRequest,
    });
    setTimeout(() => setStep('done'), 800);
  };

  const handleClose = () => {
    setStep('form');
    setDate('');
    setTime('');
    setPartySize(2);
    setSpecialRequest('');
    onClose();
  };

  const isFormValid = date && time && partySize > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={step === 'done' ? '예약 완료' : `${place.name} 예약`}>
      {step === 'form' && (
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-border-active transition-colors"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">시간</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTime(slot)}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                    time === slot
                      ? 'border-border-active bg-brand-primary/10 text-brand-primary'
                      : 'border-border-default text-text-secondary hover:border-border-active/50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">인원</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-8 h-8 rounded-lg bg-bg-elevated text-text-primary flex items-center justify-center cursor-pointer hover:bg-bg-elevated/80"
                aria-label="인원 감소"
              >
                -
              </button>
              <span className="text-lg font-semibold text-text-primary w-8 text-center">{partySize}</span>
              <button
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
                className="w-8 h-8 rounded-lg bg-bg-elevated text-text-primary flex items-center justify-center cursor-pointer hover:bg-bg-elevated/80"
                aria-label="인원 증가"
              >
                +
              </button>
              <span className="text-xs text-text-muted">명</span>
            </div>
          </div>

          {/* Special Request */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">특별 요청 (선택)</label>
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="알레르기, 좌석 선호 등"
              rows={2}
              className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors resize-none"
            />
          </div>

          <Button className="w-full" disabled={!isFormValid} onClick={handleSubmit}>
            예약 확인
          </Button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-bg-primary rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">장소</span>
              <span className="text-text-primary font-medium">{place.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">날짜</span>
              <span className="text-text-primary">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">시간</span>
              <span className="text-text-primary">{time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">인원</span>
              <span className="text-text-primary">{partySize}명</span>
            </div>
            {specialRequest && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">요청사항</span>
                <span className="text-text-primary text-right max-w-[200px]">{specialRequest}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('form')}>
              수정
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              확정하기
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center mx-auto mb-4 animate-scale-in">
            <span className="text-3xl">✅</span>
          </div>
          <h4 className="text-lg font-semibold text-text-primary mb-1">예약이 완료되었습니다</h4>
          <p className="text-sm text-text-secondary mb-1">{place.name}</p>
          <p className="text-xs text-text-muted mb-4">확인번호: {confirmNum}</p>
          <Button variant="secondary" onClick={handleClose}>
            닫기
          </Button>
        </div>
      )}
    </Modal>
  );
}
