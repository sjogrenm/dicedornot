import type { Order } from "vega";
import type { ACTION_TYPE, RESULT_TYPE, ROLL, SUB_RESULT_TYPE, SIDE, ROLL_STATUS, REQUEST_TYPE } from "../constants";

export enum Bool {
    false = undefined,
    true = 1,
}

export interface Cell {
    x?: number;
    y?: number;
}

export type MList<T> = T | T[];

export interface TeamState {
    GameTurn?: number,
    RerollNumber: number,
    ApothecaryNumber?: number,
}

export interface SkillInfo {
    SkillId: number;
}

export interface BoardState {
    ActiveTeam?: SIDE,
    ListTeams: {TeamState: TeamState[]},
    Ball: {Cell: Cell},
    KickOffTeam?: SIDE,
};

export interface Player {
    Id: PlayerId,
};

export type PlayerId = number;

export interface Replay {
    ClientVersion: string,
    filename?: string,
    url?: string,
    ReplayStep: ReplayStep[],
}

export interface ReplayStep {
    RulesEventEndTurn?: RulesEventEndTurn,
    BoardState: BoardState,
    RulesEventBoardAction?: MList<RulesEventBoardAction>,
    RulesEventKickOffTable?: RulesEventKickOffTable,
    RulesEventWaitingRequest?: '' | {RequestType?: REQUEST_TYPE, ConcernedTeam?: SIDE},
}

export interface RulesEventKickOffTable {
    EventResults: {StringMessage: MList<{MessageData: string}>},
    ListDice: string,
}

export interface KickoffEventMessageData {}
interface OrderAction {
    Order: {CellFrom: Cell, CellTo: {Cell: Cell}}
}
export interface PlayerAction {
    PlayerId?: PlayerId
}


export function isDiceRollResult(result: BoardActionResult): result is DiceRollResult {
    return (result as DiceRollResult).RollStatus !== undefined;
}
export interface DiceRollResult {
    CoachChoices: {
        ListDices: string | number,
        ListSkills: "" | {SkillInfo: MList<SkillInfo>},
        ListCells: "",
    },
    ResultType?: RESULT_TYPE,
    SubResultType?: SUB_RESULT_TYPE,
    IsOrderCompleted: Bool,
    ListModifiers: "" | {DiceModifier: MList<{Value: number}>},
    Requirement?: number,
    RollStatus?: ROLL_STATUS,
    RollType: ROLL,
}

export interface CellChoiceResult {
    CoachChoices: {
        ListCells: {Cell: MList<Cell>},
        ListSkills: "" | {SkillInfo: MList<SkillInfo>},
        ListDices: "",
    },
    ResultType: RESULT_TYPE,
    SubResultType?: SUB_RESULT_TYPE,
    IsOrderCompleted: Bool,
}

export type WeatherResult =
    | {RollType: ROLL.Weather} & DiceRollResult

export type BlockResult =
    | {RollType: ROLL.Block} & DiceRollResult
    | {RollType: ROLL.Push} & CellChoiceResult
    | {RollType: ROLL.FollowUp} & CellChoiceResult
    | {RollType: ROLL.FoulAppearance} & DiceRollResult;
export type BlitzResult = BlockResult | {RollType: ROLL.GFI} & DiceRollResult;

export type CatchResult = DiceRollResult;
export type MoveResult = {RollType: ROLL.GFI | ROLL.Leap | ROLL.Dodge} & DiceRollResult;
export type ActivationTestResult = {RollType: ROLL.BoneHead | ROLL.ReallyStupid | ROLL.WildAnimal | ROLL.TakeRoot} & DiceRollResult;
export type PassResult = DiceRollResult;
export type PickupResult = DiceRollResult;
export type TakeDamageResult = DiceRollResult & {RollType: ROLL};
export type WakeUpResult = DiceRollResult & {RollType: ROLL.WakeUp};

export interface ResultsAction<T> {
    Results: {BoardActionResult: MList<T>}
}
export interface Action extends ResultsAction<BoardActionResult> {ActionType?: ACTION_TYPE}
export interface BlockAction extends PlayerAction, OrderAction, ResultsAction<BlockResult> {ActionType: ACTION_TYPE.Block}
export interface BlitzAction extends PlayerAction, OrderAction, ResultsAction<BlockResult | MoveResult> {ActionType: ACTION_TYPE.Blitz}
export interface WeatherAction extends ResultsAction<WeatherResult> {ActionType: ACTION_TYPE.InitialWeather}
export interface CatchAction extends OrderAction, ResultsAction<CatchResult>   {}
export interface TurnoverAction extends ResultsAction<{}>{
    ActionType: ACTION_TYPE.Turnover,
    Turnover?: Bool
}
export interface FoulAction extends OrderAction, PlayerAction, ResultsAction<TakeDamageResult> {ActionType: ACTION_TYPE.Foul}
export interface StunWakeAction extends PlayerAction, ResultsAction<{}> {ActionType: ACTION_TYPE.StunWake}
export interface WakeUpAction extends PlayerAction, ResultsAction<WakeUpResult> {ActionType: ACTION_TYPE.WakeUp}
export interface HandoffAction extends OrderAction, ResultsAction<{}> {}
export interface KickoffAction extends OrderAction, ResultsAction<{}> {}
export interface LeapAction extends MoveAction {}
export interface MoveAction extends PlayerAction, OrderAction, ResultsAction<MoveResult>  {}
export interface ActivationTestAction extends OrderAction, ResultsAction<ActivationTestResult>  {}
export interface PassAction extends OrderAction, ResultsAction<PassResult> {ActionType: ACTION_TYPE.Pass}
export interface PickupAction extends ResultsAction<PickupResult> {}
export interface TakeDamageAction extends PlayerAction, ResultsAction<TakeDamageResult>  {ActionType: ACTION_TYPE.TakeDamage}
export interface ScatterAction extends OrderAction, ResultsAction<{}> {ActionType: ACTION_TYPE.Scatter};
export interface ActivatePlayerAction extends PlayerAction, ResultsAction<{}> {ActionType: ACTION_TYPE.ActivatePlayer};

export interface FansAction extends ResultsAction<{}> {ActionType: ACTION_TYPE.FansNumber};

export type RulesEventBoardAction =
    | BlockAction
    | BlitzAction
    | WeatherAction
    | {ActionType: ACTION_TYPE.Catch} & CatchAction
    | TurnoverAction
    | FoulAction
    | StunWakeAction
    | {ActionType: ACTION_TYPE.Handoff} & HandoffAction
    | {ActionType: ACTION_TYPE.Kickoff} & KickoffAction
    | {ActionType: ACTION_TYPE.Leap} & LeapAction
    | {ActionType?: ACTION_TYPE.Move} & MoveAction
    | {ActionType: ACTION_TYPE.ActivationTest} & ActivationTestAction
    | PassAction
    | {ActionType: ACTION_TYPE.Pickup} & PickupAction
    | TakeDamageAction
    | ScatterAction
    | {ActionType: ACTION_TYPE.TouchDown} & ResultsAction<{}>
    | ActivatePlayerAction
    | FansAction
    | WeatherAction
    | WakeUpAction

export type BoardActionResult = DiceRollResult | CellChoiceResult

export interface RulesEventEndTurn {}