import { writable, derived } from 'svelte/store';
import type { ReplayPreview } from './replay-utils';
import type {ProcessedReplay} from './replay.js';
import type {PlayerDefinitions, PlayerProperties} from './viewer/types.js';
import type {PlayerStates} from './replay/Internal.js';
import { sineInOut } from "svelte/easing";
import { crossfade } from "svelte/transition";

let startingUrl = new URL(window.location.href);
let target: number | undefined;
let stParam = startingUrl.searchParams.get('st');
if (stParam != undefined) {
  target = parseInt(stParam);
} else if (startingUrl.hash) {
  target = parseInt(startingUrl.hash.replace('#', ''));
}

export const timing = writable<number>(500);
export const transition = derived(timing, $timing => {
  let [send, receive] = crossfade({
      duration: $timing * 0.8,
      easing: sineInOut,

      fallback(node) {
        const style = getComputedStyle(node);
        const transform = style.transform === "none" ? "" : style.transform;

        return {
          duration: $timing * 0.8,
          easing: sineInOut,
          css: (t) => `
            transform: ${transform} scale(${t});
            opacity: ${t}
          `,
        };
      },
    });
    return {send, receive};
  });
export const selectedPlayer = writable<number | undefined>(undefined);
export const hoveredPlayer = writable<number | undefined>(undefined);
export const replay = writable<ProcessedReplay | undefined>(undefined);
export const replayCurrent = writable<number>(0);
export const replayTarget = writable<number | undefined>(target);
export const replayPreview = writable<ReplayPreview | undefined>(undefined);
export const error = writable<Error | string | undefined>(undefined);
export const showResultsAnalysis = writable<boolean>(false);
export const playerStates = writable<PlayerStates>(new Map());
export const playerDefs = writable<PlayerDefinitions>(new Map());
export const playerProperties = writable<PlayerProperties>(new Map());
