import { writable } from 'svelte/store';
import { ReplayPosition } from './replay-utils';

export const timing = writable(300);
export const selectedPlayer = writable(null);
export const replay = writable(null);
export const replayCurrent = writable(new ReplayPosition());
export const replayTarget = writable(null);
export const error = writable(null);
