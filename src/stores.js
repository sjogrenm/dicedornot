import { writable } from 'svelte/store';

export const timing = writable(300);
export const selectedPlayer = writable(null);
export const replay = writable(null);
export const replayStart = writable(null);
export const replayEnd = writable(null);
export const replayStepIndex = writable(0);
