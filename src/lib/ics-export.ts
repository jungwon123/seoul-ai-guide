import type { Itinerary } from '@/types';

/**
 * ICS 파일 생성 및 다운로드 (클라이언트 사이드)
 */
export function downloadICS(itinerary: Itinerary) {
  const events = itinerary.stops
    .map((stop) => {
      const [hours, minutes] = stop.arrivalTime.split(':').map(Number);
      const startDate = new Date(itinerary.date);
      startDate.setHours(hours, minutes, 0);
      const endDate = new Date(startDate.getTime() + stop.duration * 60000);

      const formatICSDate = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      return `BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${stop.placeName}
DESCRIPTION:${itinerary.title} - ${stop.order}번째 방문
END:VEVENT`;
    })
    .join('\n');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Seoul AI Guide//KR
CALSCALE:GREGORIAN
${events}
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${itinerary.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
