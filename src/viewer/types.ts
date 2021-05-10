
import type * as BB2 from "../replay/BB2.js";
import type * as Internal from "../replay/Internal.js";
import type {
    ReplayPosition,
    ReplayPreview,
} from "../replay-utils.js";
import type { ProcessedReplay } from '../replay.js';
import type {
    SIDE,
} from "../constants.js";

export interface Dugout {
    cas: BB2.PlayerId[],
    ko: BB2.PlayerId[],
    reserve: BB2.PlayerId[],
}

export interface Team {
    logo: string,
    dugout: Dugout,
    score: number,
    name: string,
    turn: number,
    active: boolean,
    rerolls: {
        available: number,
        total: number,
    },
    inducements: {
        wizard: boolean,
        babes: number,
        apo: {
          available: number,
          total: number
        },
        chef: boolean,
        bribes: {
          available: number,
          total: number,
        },
        igor: boolean,
      },
}

export interface BallProps {
    held: boolean;
}

export interface CellProps {
    active?: boolean;
    target?: boolean;
    pushbackChoice?: boolean;
    moved?: boolean;
    plus?: number;
}

export interface BloodProps {
    blood: number;
}

export interface PitchCellProps {
    cell?: CellProps;
    dice?: number[];
    player?: Internal.PlayerNumber;
    ball?: BallProps;
    foul?: boolean;
    blood?: BloodProps;
}

export interface PlayerProps {
    data: BB2.Player;
    blitz?: boolean;
    moving?: boolean;
    prone?: boolean;
    team?: SIDE;
    stunned?: boolean;
    stupidity?: string;
}

export interface WakeConditions {
    replayPreview: ReplayPreview | undefined,
    playing: boolean,
    replayTarget: ReplayPosition | undefined,
    replay: ProcessedReplay | undefined,
}

export interface Preview {
    homeTeam: Team,
    awayTeam: Team,
    pitch: Record<string, PitchCellProps>,
    players: Record<string, PlayerProps>,
    playing: boolean,
    current: ReplayPosition,
}
