import type {ACTION_TYPE, RACE_ID, BLOCK, SKILL, ROLL} from '../constants.js';

export type ByTeam<T> = {
    home: T,
    away: T
}

export interface Cell {
    x: number,
    y: number,
}

export interface ModifiedD6SumRoll {
    player: PlayerId,
    roll: number[],
    target: number,
}

export interface Replay {
    teams: ByTeam<Team>,
    drives: Drive[],
}

export interface Team {
    players: Record<PlayerNumber, Player>,
    race: RACE_ID,
}

export type Side = keyof ByTeam<any>;
export type PlayerNumber = number;
export interface PlayerId {
    side: Side,
    number: PlayerNumber;
}

export interface Player {
    id: PlayerId,
}

export interface Checkpoint {
    _checkpointData: any
}

type KickoffRoll = any;
type SetupAction = any;
type CatchRoll = any;
type PassRoll = any;
type FoulRoll = any;

export interface Drive extends Checkpoint {
    wakeups: ByTeam<WakeupRoll[]>;
    setup: ByTeam<SetupAction[]>;
    kickoff: KickoffRoll;
    turns: Turn[];
}

export interface WakeupRoll extends ModifiedD6SumRoll {
}

export enum WizardType {
    fireball = "fireball",
    bolt = "bolt",
}
export interface WizardRoll {
    type: WizardType,
    target: Cell,
    effects: ModifiedD6SumRoll,
} 

export interface Turn extends Checkpoint {
    number: number,
    side: keyof ByTeam<any>,
    activations: Activation[],
    startWizard?: WizardRoll,
    endWizard?: WizardRoll,
}

export interface Activation extends Checkpoint {
    playerId: PlayerId,
    test?: ActivationTest,
    action: Action,
}

export type Action =
    | BlockAction
    | BlitzAction
    | PassAction
    | MoveAction
    | FoulAction
    | HandoffAction

export type MovePath = Cell[];

export interface ActivationTest extends ModifiedD6SumRoll {
}

export interface RollAction<R> {
    player: PlayerId,
    roll: R,
}

export interface MoveAndRollAction<R> extends RollAction<R> {
    before?: MovePath,
}

export interface BlockAction extends RollAction<BlockRoll> {
    actionType: ACTION_TYPE.Block,
    target: PlayerId,
}

export interface BlitzAction extends MoveAndRollAction<BlockRoll> {
    actionType: ACTION_TYPE.Blitz,
    target: PlayerId,
    after?: MovePath,
}

export interface PassAction extends MoveAndRollAction<PassRoll> {
    actionType: ACTION_TYPE.Pass,
    targetSquare: Cell,
}

export interface MoveAction {
    actionType: ACTION_TYPE.Move,
    player: PlayerId,
    path: MovePath,
}

export interface HandoffAction extends MoveAndRollAction<CatchRoll> {
    actionType: ACTION_TYPE.Handoff,
}

export interface FoulAction extends MoveAndRollAction<FoulRoll> {
    actionType: ACTION_TYPE.Foul,
}

export interface BlockRoll {
    roll: Reroll<BLOCK[]>,
    uphill: boolean,
    target: PlayerId,
    selectedOutcome: BLOCK,
    assistingPlayers: PlayerId[],
    push?: PushOutcome,
    knockdown: boolean,
    armor?: ArmorRoll,
}

export interface PushOutcome {
    pushChoices: Cell[],
    follow: boolean,
    skillsUsed: {
        player: PlayerId,
        skill: SKILL,
    }
}

export interface CasualtyRoll {}

export interface ArmorRoll {
    rollType: ROLL.Armor,
    roll: Reroll<number[]>,
    casualty?: CasualtyRoll,
}

export interface Reroll<R> {
    roll: R,
    reroll?: R,
    rerollSource: "team" | SKILL
}