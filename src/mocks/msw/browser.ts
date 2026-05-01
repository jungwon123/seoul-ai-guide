// MSW worker — dev에서만 부팅. main.tsx에서 동적 import.

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
