// SSE 블록 렌더러 일괄 export.

import type { ReactElement } from 'react';
import type { Block } from '@/types/api';
import type { Place } from '@/types';
import ChartBlock from './ChartBlock';
import EventsBlock from './EventsBlock';
import ReferencesBlock from './ReferencesBlock';
import AnalysisSourcesBlock from './AnalysisSourcesBlock';
import DisambiguationBlock from './DisambiguationBlock';
import MapBlock from './MapBlock';
import MapRouteBlock from './MapRouteBlock';
import CalendarBlock from './CalendarBlock';

export {
  ChartBlock,
  EventsBlock,
  ReferencesBlock,
  AnalysisSourcesBlock,
  DisambiguationBlock,
  MapBlock,
  MapRouteBlock,
  CalendarBlock,
};

export function BlockRenderer({ block, places }: { block: Block; places?: Place[] }): ReactElement | null {
  switch (block.type) {
    case 'chart':
      return <ChartBlock data={block} />;
    case 'events':
      return <EventsBlock data={block} />;
    case 'references':
      return <ReferencesBlock data={block} />;
    case 'analysis_sources':
      return <AnalysisSourcesBlock data={block} />;
    case 'disambiguation':
      return <DisambiguationBlock data={block} />;
    case 'map_markers':
      // places 가 있으면 place_id 매칭으로 진짜 카테고리/이미지 복원 (BE MarkerItem 은 카테고리 미포함).
      return <MapBlock markers={block.markers} places={places} />;
    case 'map_route':
      return <MapRouteBlock data={block} />;
    case 'calendar':
      return <CalendarBlock data={block} />;
    default:
      return null;
  }
}
