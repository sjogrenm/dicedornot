import { writable } from 'svelte/store';

export const pitch = writable(new Array(15).fill().map(() => new Array(26).fill().map(() => ({}))));
export const homeTeam = writable({});
export const awayTeam = writable({});
