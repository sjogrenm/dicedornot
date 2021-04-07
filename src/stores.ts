import { writable } from 'svelte/store';
import { ReplayPosition } from './replay-utils';
import type {ProcessedReplay} from './replay.js';

let startingUrl = new URL(window.location.href);
let target: ReplayPosition = null;
if (startingUrl.searchParams.get('st')) {
  target = ReplayPosition.fromParam(startingUrl.searchParams.get('st'));
} else if (startingUrl.hash) {
  target = ReplayPosition.fromParam(startingUrl.hash.replace('#', ''));
}

export interface ReplayPreview {
  start: ReplayPosition,
  end: ReplayPosition,
}

export const timing = writable<number>(300);
export const selectedPlayer = writable<number>(null);
export const hoveredPlayer = writable<number>(null);
export const replay = writable<ProcessedReplay>(null);
export const replayCurrent = writable<ReplayPosition>(new ReplayPosition());
export const replayTarget = writable<ReplayPosition>(target);
export const replayPreview = writable<ReplayPreview>(null);
export const error = writable<Error | string>(null);
export const showResultsAnalysis = writable<boolean>(false);
