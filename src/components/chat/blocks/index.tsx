// SSE 블록 렌더러 일괄 export.

import type { ReactElement } from 'react';
import type { Block } from '@/types/api';
import ChartBlock from './ChartBlock';
import EventsBlock from './EventsBlock';
import ReferencesBlock from './ReferencesBlock';
import AnalysisSourcesBlock from './AnalysisSourcesBlock';
import DisambiguationBlock from './DisambiguationBlock';
import MapMarkersBlock from './MapMarkersBlock';
import MapRouteBlock from './MapRouteBlock';
import CalendarBlock from './CalendarBlock';

export {
  ChartBlock,
  EventsBlock,
  ReferencesBlock,
  AnalysisSourcesBlock,
  DisambiguationBlock,
  MapMarkersBlock,
  MapRouteBlock,
  CalendarBlock,
};

export function BlockRenderer({ block }: { block: Block }): ReactElement | null {
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
      return <MapMarkersBlock data={block} />;
    case 'map_route':
      return <MapRouteBlock data={block} />;
    case 'calendar':
      return <CalendarBlock data={block} />;
    default:
      return null;
  }
}
