import { writable } from 'svelte/store';
import { ReplayPosition } from './replay-utils';

let startingUrl = new URL(window.location);
let target = null;
if (startingUrl.searchParams.get('st')) {
  target = ReplayPosition.fromParam(startingUrl.searchParams.get('st'));
} else if (startingUrl.hash) {
  target = ReplayPosition.fromParam(startingUrl.hash.replace('#', ''));
}

export const timing = writable(300);
export const selectedPlayer = writable(null);
export const hoveredPlayer = writable(null);
export const replay = writable(null);
export const replayCurrent = writable(new ReplayPosition());
export const replayTarget = writable(target);
export const replayPreview = writable(null);
export const error = writable(null);
export const showResultsAnalysis = writable(false);
