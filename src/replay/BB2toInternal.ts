import {
    RACE_ID, SIDE, ACTION_TYPE, weatherTable,
    WEATHER, ROLL, getPlayerType, STATUS, SITUATION, KICKOFF_RESULT
} from '../constants.js';
import * as B from './BB2.js';
import * as I from './Internal.js';
import { cellEq } from './Internal.js';
import parser from 'fast-xml-parser';
import he from 'he';
import { ensureKeyedList, ensureList, translateStringNumberList } from '../replay-utils.js';
import type { DeepReadonly, DeepWritable } from "ts-essentials";

function requireValue<T>(v: T | undefined, msg: string, obj: any): T {
    if (v === undefined) {
        throw { msg, obj };
    }
    return v;
}

class Replay {
    constructor(
        public unhandledSteps: DeepReadonly<DeepReadonly<B.ReplayStep>>[],
        public teams: I.ByTeam<Team> = { home: new Team(), away: new Team() },
        public stadium: DeepWritable<I.Replay['stadium']> = { name: "N/A", type: "" },
        public drives: Drive[] = [],
        private foundUnhandledStep = false,
        public finalScore: I.ByTeam<number> = { home: 0, away: 0 },
        public metadata: DeepWritable<I.Replay['metadata']> = { datePlayed: new Date() },
        public gameLength: number = 0,
        public fame: I.ByTeam<I.Roll> = { home: [], away: [] },
        public initialWeather: WEATHER = WEATHER.Nice,
        public coinFlipWinner: I.Side = "home",
        public initialKickingTeam: I.Side = "home",
        public checkpoint: I.Checkpoint = { playerStates: {} },
    ) {
        this.unhandledSteps = [...this.unhandledSteps];
    }

    processUnorderedSteps() {
        // Handle un-ordered replay steps
        for (const step of this.unhandledSteps) {
            if ('RulesEventGameFinished' in step) {
                this.handleGameFinishedStep(step);
            } else if ('GameInfos' in step) {
                this.handleGameInfo(step);
            }
        }
    }

    processSteps() {
        this.processUnorderedSteps();
        for (let stepIdx = 0; stepIdx <= this.unhandledSteps.length; stepIdx++) {
            if (this.foundUnhandledStep) {
                return;
            }
            const step = this.unhandledSteps[stepIdx];
            if ('RulesEventGameFinished' in step || 'GameInfos' in step) {
                // Handled as an unordered replay step
            } else if ('RulesEventAddInducementSkill' in step) {
                this.handleAddInducementSkillStep(stepIdx, step);
            } else if ('RulesEventSetUpAction' in step) {
                this.handleSetUpAction(stepIdx, step);
            } else if ('RulesEventSetUpConfiguration' in step) {
                this.handleSetUpConfiguration(stepIdx, step);
            } else if ('RulesEventSetGeneratedPersonnalities' in step) {
                // don't need to handle this
            } else if (
                'RulesEventApplyInducements' in step ||
                'RulesEventAddMercenary' in step ||
                'RulesEventAddInducement' in step ||
                'RulesEventInducementsInfos' in step
            ) {
                this.handleAddInducementStep(stepIdx, step);
            } else if (
                'BoardState' in step
            ) {
                this.handleGameTurnStep(stepIdx, step);
            } else {
                badStep(stepIdx, step);
            }
            if ('BoardState' in step) {
                this.checkpoint = this.captureCheckpoint(step.BoardState);
            }
        }
    }

    captureCheckpoint(boardState: DeepReadonly<B.BoardState>): I.Checkpoint {
        return {
            playerStates: Object.fromEntries(boardState.ListTeams.TeamState.flatMap(team =>
                ensureKeyedList("PlayerState", team.ListPitchPlayers).map(player =>
                    [player.Id, convertPlayerState(team, player)]
                )
            )),
            boardState,
        };
    }

    handleGameFinishedStep(step: DeepReadonly<B.GameFinishedStep>) {
        this.finalScore.home = step.RulesEventGameFinished.MatchResult.Row.HomeScore || 0;
        this.finalScore.away = step.RulesEventGameFinished.MatchResult.Row.AwayScore || 0;
        this.metadata.datePlayed = new Date(step.RulesEventGameFinished.MatchResult.Row.Finished);
    }

    handleAddInducementStep(stepIdx: number, step: DeepReadonly<B.AddInducementStep>) {
        if ('RulesEventAddMercenary' in step) {
            // We can pull mercenaries from board state.
            for (const merc of ensureList(step.RulesEventAddMercenary)) {
                const playerNumber = merc.MercenaryId;
                const side = convertSide(B.playerIdSide(playerNumber));
                const team = this.teams[side];
                const pitchPlayers = ensureKeyedList('PlayerState', step.BoardState.ListTeams.TeamState[side == 'home' ? 0 : 1].ListPitchPlayers);
                const pitchPlayer = pitchPlayers.find(p => p.Id == merc.MercenaryId);
                assert(pitchPlayer != undefined);
                const player: DeepWritable<I.Player> = convertPlayerDefinition(pitchPlayer);
                team.players.set(player.id.number, player)
                team.inducements.mercenaries.set(player.id.number, player);
            }
        }
        if ('RulesEventAddInducement' in step) {
            // We can pull inducements applied from the board state.
        }
        if ('RulesEventRemoveInducement' in step) {
            // We can pull inducements applied from the board
        }
        if ('RulesEventInducementInfos' in step) {
            // Don't bother listing what the available inducements were
        }
        if ('RulesEventApplyInducements' in step) {
            // Nothing to add to replay
        }
        if ('RulesEventWaitingRequest' in step) {
            // No replay changes
        }
    }

    handleAddInducementSkillStep(stepIdx: number, step: DeepReadonly<B.AddInducementSkillStep>) {
        const player = step.RulesEventAddInducementSkill.MercenaryId;
        const side = convertSide(B.playerIdSide(player));
        const skill = step.RulesEventAddInducementSkill.SkillId;
        const team = this.teams[side];
        const merc = team.inducements.mercenaries.get(player);
        if (merc) {
            merc.skills.push(skill);
        } else {
            console.warn("Unable to find merc to add skills to", { step, replay: this, team });
        }
        team.players.get(player)!.skills.push(skill);
    }

    handleGameInfo(step: DeepReadonly<B.GameInfoStep>) {
        this.stadium.name = he.decode(step.GameInfos.NameStadium.toString());
        this.stadium.type = step.GameInfos.Stadium;
        this.stadium.enhancement = step.GameInfos.StructStadium;

        for (const side of I.sides as I.Side[]) {
            this.teams[side].coach = he.decode(ensureList(step.GameInfos.CoachesInfos.CoachInfos)[SIDE[side]].UserId.toString());

            const bb2Team = step.BoardState.ListTeams.TeamState[SIDE[side]];
            this.teams[side].race = bb2Team.Data.IdRace;
            this.teams[side].name = he.decode(bb2Team.Data.Name.toString());
            this.teams[side].logo = bb2Team.Data.Logo;

            this.teams[side].players = new Map(
                ensureKeyedList("PlayerState", bb2Team.ListPitchPlayers).map(p => [p.Id, convertPlayerDefinition(p)])
            );
        }

        this.metadata.league = step.GameInfos.RowLeague.Name && he.decode(step.GameInfos.RowLeague.Name.toString());
    }

    handleSetUpConfiguration(stepIdx: number, step: DeepReadonly<B.SetUpConfigurationStep>) {
        const side = convertSide(step.RulesEventWaitingRequest == '' ? SIDE.home : step.RulesEventWaitingRequest.ConcernedTeam || SIDE.home);
        const currentDrive = this.lastDrive();
        const currentSetup = currentDrive.setups[side];

        const nextSetup = {
            checkpoint: this.checkpoint,
            movedPlayers: Object.fromEntries(
                step.RulesEventSetUpConfiguration.ListPlayersPositions.PlayerPosition.map(pos => {
                    return [pos.PlayerId || 0, convertCell(pos.Position)];
                })
            )
        }
        currentSetup.push(nextSetup);
    }

    handleSetUpAction(stepIdx: number, step: DeepReadonly<B.SetUpActionStep>) {
        const fromCell = convertCell(step.RulesEventSetUpAction.PlayerPosition);
        const toCell = convertCell(step.RulesEventSetUpAction.NewPosition);
        const alsoMove = step.RulesEventSetUpAction.Substitute;
        const side = convertSide(step.RulesEventWaitingRequest == '' ? SIDE.home : step.RulesEventWaitingRequest.ConcernedTeam || SIDE.home);
        const currentDrive = this.lastDrive();
        const currentSetup = currentDrive.setups[side];
        const players: DeepReadonly<Record<I.PlayerNumber, I.PlayerState>> = this.checkpoint.playerStates;

        const movedPlayer = Object.entries(players)
            .find(([_, state]) => state.pitchCell && cellEq(fromCell, state.pitchCell));

        console.assert(movedPlayer != undefined, "Couldn't find moved player", step, this);
        if (movedPlayer != undefined) {
            const movedPlayers = { [movedPlayer[0]]: toCell };
            if (alsoMove) {
                movedPlayers[alsoMove] = fromCell;
            }
            const nextSetup = {
                checkpoint: this.checkpoint,
                movedPlayers
            }
            currentSetup.push(nextSetup);
        }
    }

    handleGameTurnStep(stepIdx: number, step: DeepReadonly<B.GameTurnStep>) {
        if (
            step.RulesEventKickOffChoice
        ) {
            this.coinFlipWinner = convertSide(step.RulesEventKickOffChoice.ChosingTeam || 0);
            this.initialKickingTeam = convertSide(step.RulesEventKickOffChoice.KickOffTeam || 0);
        }
        if (
            step.RulesEventForcedDices
        ) {
            this.cantHandle(stepIdx, step, "Can't handle RulesEventForcedDices");
            return;
        }
        if (
            step.RulesEventCoachChoice
        ) {
            if (step.RulesEventBoardAction &&
                'ActionType' in step.RulesEventBoardAction &&
                step.RulesEventBoardAction.ActionType == ACTION_TYPE.KickoffScatter &&
                'Results' in step.RulesEventBoardAction) {
                const results = ensureKeyedList("BoardActionResult", step.RulesEventBoardAction.Results);
                if (results[0] && results[0].RollType == ROLL.TouchBack) {
                    const kickingTeam = playerNumberToSide(step.RulesEventBoardAction.PlayerId || 0);
                    const receivingPlayers = ensureKeyedList(
                        "PlayerState",
                        step.BoardState.ListTeams.TeamState[kickingTeam == "home" ? 1 : 0].ListPitchPlayers
                    );
                    const receivingPlayer = receivingPlayers[step.RulesEventCoachChoice.IndexChosen];
                    this.lastDrive().kickoff.touchbackTo = receivingPlayer.Id;
                } else {
                    this.cantHandle(stepIdx, step, "Can't handle non-touchback scatter RulesEventCoachChoice");
                }
            } else {
                this.cantHandle(stepIdx, step, "Can't handle non-Kickoff RulesEventCoachChoice");
            }
            return;
        }
        if (
            step.RulesEventSpecialAction
        ) {
            this.cantHandle(stepIdx, step, "Can't handle RulesEventSpecialAction");
            return;
        }
        if (
            step.RulesEventKickOffEventCancelled
        ) {
            const drive = this.lastDrive();
            drive.kickoff.event = {
                dice: [step.RulesEventKickOffEventCancelled.EventCancelled],
                total: step.RulesEventKickOffEventCancelled.EventCancelled as KICKOFF_RESULT,
                cancelled: true,
            };
        }
        if (
            step.RulesEventLoadGame
        ) {
            this.cantHandle(stepIdx, step, "Can't handle RulesEventLoadGame");
            return;
        }
        if (step.RulesEventWaitingRequest) {
            // Ignore this
        }
        if (step.RulesEventEndTurn) {
            if (step.RulesEventEndTurn.NewDrive) {
                this.drives.push(new Drive(
                    this.captureCheckpoint(step.BoardState),
                    convertSide(step.RulesEventEndTurn.PlayingTeam || SIDE.home),
                ));
            }
        }
        if (step.RulesEventKickOffTable) {
            const drive = this.lastDrive();
            const dice = translateStringNumberList(step.RulesEventKickOffTable.ListDice);
            const total = dice.reduce((l, r) => l + r, 0) as KICKOFF_RESULT;
            switch (total) {
                case KICKOFF_RESULT.Blitz:
                    drive.kickoff.event = {
                        dice,
                        total,
                        cancelled: false,
                        activations: [],
                    }
                    break;
                case KICKOFF_RESULT.BrilliantCoaching:
                    const messages = ensureKeyedList('StringMessage', step.RulesEventKickOffTable.EventResults);
                    const messageData = parser.parse(he.decode(messages[0].MessageData), {
                        ignoreAttributes: true,
                    }) as B.KickoffEventMessageData;
                    drive.kickoff.event = {
                        dice,
                        total,
                        cancelled: false,
                        coaching: {home: [], away: []},
                        rerolls: {home: 0, away: 0},
                    }
                case KICKOFF_RESULT.ChangingWeather:
                case KICKOFF_RESULT.CheeringFans:
                case KICKOFF_RESULT.GetTheRef:
                case KICKOFF_RESULT.HighKick:
                case KICKOFF_RESULT.PerfectDefence:
                case KICKOFF_RESULT.PitchInvasion:
                case KICKOFF_RESULT.QuickSnap:
                case KICKOFF_RESULT.Riot:
                case KICKOFF_RESULT.ThrowARock:
                    break
            }
        }
        if (step.RulesEventBoardAction) {
            const actions = ensureList(step.RulesEventBoardAction);
            const converters = actions.map(action => actionConverter(this, step, action));
            if (converters.some(converter => converter == undefined)) {
                this.cantHandle(stepIdx, step, "Not all action types can be converted");
                return
            }
            converters.forEach(converter => converter!());
        }
    }

    cantHandle(stepIdx: number, step: DeepReadonly<B.ReplayStep>, reason?: string) {
        console.log("Couldn't handle step", { stepIdx, step, reason });
        this.unhandledSteps = this.unhandledSteps.slice(stepIdx);
        this.foundUnhandledStep = true;
    }

    lastDrive(): Drive {
        let drive = last(this.drives);
        if (!drive) {
            throw new Error("No drive created when required");
        }
        return drive;
    }
}

function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

function actionConverter(replay: Replay, step: DeepReadonly<B.GameTurnStep>, action: DeepReadonly<B.RulesEventBoardAction>): undefined | (() => void) {
    if ('ActionType' in action) {
        switch (action.ActionType) {
            case ACTION_TYPE.FansNumber:
                return () => convertFansNumber(replay, action);
            case ACTION_TYPE.InitialWeather:
                return () => convertInitialWeather(replay, action);
            case ACTION_TYPE.KickoffTarget:
                return () => convertKickoffTarget(replay, action);
            case ACTION_TYPE.KickoffScatter:
                return () => convertKickoffScatter(replay, action);
            case ACTION_TYPE.TakeDamage:
                return () => convertTakeDamage(replay, action);
            case ACTION_TYPE.ActivatePlayer:
                return () => convertActivatePlayer(replay, step, action);
            default:
                return undefined;
        }
    } else {
        return undefined;
    }
}

function convertFansNumber(replay: Replay, action: DeepReadonly<B.FansAction>): void {
    for (const fanRoll of ensureKeyedList("BoardActionResult", action.Results)) {
        const team = convertSide(fanRoll.CoachChoices.ConcernedTeam || 0);
        const dice = translateStringNumberList(fanRoll.CoachChoices.ListDices);
        replay.fame[team] = dice;
    }
};

function convertInitialWeather(replay: Replay, action: DeepReadonly<B.WeatherAction>): void {
    const result = ensureKeyedList("BoardActionResult", action.Results)[0];
    const dice = translateStringNumberList(result.CoachChoices.ListDices);
    replay.initialWeather = weatherTable(dice[0] + dice[1]);
}

function convertKickoffTarget(replay: Replay, action: B.KickoffAction): void {
    const drive = replay.lastDrive();
    drive.kickoff.checkpoint = replay.checkpoint;
    drive.kickoff.target = convertCell(action.Order.CellTo.Cell);
}

function convertKickoffScatter(replay: Replay, action: B.ScatterAction): void {
    const drive = replay.lastDrive();
    if (drive.kickoff.scatters == undefined) {
        drive.kickoff.scatters = [];
    }
    for (const result of ensureKeyedList("BoardActionResult", action.Results)) {
        switch (result.RollType) {
            case ROLL.KickoffScatter:
                drive.kickoff.scatters.push(convertCell(action.Order.CellTo.Cell));
                break;
            case ROLL.ThrowIn:
                drive.kickoff.scatters.push(convertCell(action.Order.CellTo.Cell));
                break;
            case ROLL.TouchBack:
                if (result.IsOrderCompleted) {
                    drive.kickoff.scatters.push(convertCell(action.Order.CellTo.Cell));
                }
                break;
            case ROLL.KickoffGust:
                drive.kickoff.scatters.push(convertCell(action.Order.CellTo.Cell));
                break;
        }
    }
}

function convertTakeDamage(replay: Replay, action: B.TakeDamageAction): void {
    const drive = replay.lastDrive();
    const damage: I.Damage = {
        player: {
            side: playerNumberToSide(action.PlayerId || 0),
            number: action.PlayerId || 0,
        },
    };
    for (const result of ensureKeyedList("BoardActionResult", action.Results)) {
        switch (result.RollType) {
            case ROLL.Injury:
                damage.injury = convertDiceRollResult(result);
                break;
            case ROLL.Armor:
                damage.armor = convertDiceRollResult(result);
                break
            case ROLL.Casualty:
                damage.casualty = convertDiceRollResult(result);
                break
            case ROLL.Regeneration:
                damage.regeneration = convertDiceRollResult(result);
                break
            case ROLL.PileOnArmorRoll:
                if ('ListDices' in result.CoachChoices) {
                    assert('ListDices' in result);
                    damage.armor!.pileOn = convertDiceRollResult(result);
                }
                break
            case ROLL.PileOnInjuryRoll:
                if ('ListDices' in result.CoachChoices) {
                    assert('ListDices' in result);
                    damage.casualty!.pileOn = convertDiceRollResult(result);
                }
                break
            case ROLL.ChainsawArmor:
                damage.armor = convertDiceRollResult(result);
                break
            case ROLL.RaiseDead:
                damage.raiseDead = true;
                break
            default:
                badResult(result);
        }
    }

    if (drive.turns) {
    } else { // Damage from a rocks during kickoff
        if (drive.kickoff.event.total == KICKOFF_RESULT.ThrowARock && !drive.kickoff.event.cancelled) {
            drive.kickoff.event.damage.push(damage);
        }
    }
}

function convertActivatePlayer(replay: Replay, step: DeepReadonly<B.GameTurnStep>, action: B.ActivatePlayerAction) {
    const drive = replay.lastDrive();
    let turn = last(drive.turns);
    const playerNumber = action.PlayerId || 0;
    const playerSide = playerNumberToSide(playerNumber);
    const teamState = step.BoardState.ListTeams.TeamState[playerSide == 'home' ? 0 : 1];
    if (!turn || turn.side != playerSide || turn.number != teamState.GameTurn) {
        turn = new Turn(
            teamState.GameTurn || 0,
            playerSide,
            replay.checkpoint,
        )
        drive.turns.push(turn);
    }
    turn.activations.push(new Activation(
        { side: playerSide, number: playerNumber },
        replay.checkpoint
    ));
}

class Team {
    constructor(
        public players: Map<I.PlayerNumber, DeepWritable<I.Player>> = new Map(),
        public inducements: DeepWritable<I.Inducements> = { mercenaries: new Map() },
        public race: RACE_ID = RACE_ID.Human,
        public coach: string = "N/A",
        public name: string = "N/A",
        public logo: string = "",
    ) { }
}

class Drive {
    constructor(
        public checkpoint: I.Checkpoint,
        public kickingTeam: I.Side,
        public wakeups: I.KickoffOrder<I.WakeupRoll[]> = { home: [], away: [] },
        public setups: I.KickoffOrder<I.SetupAction[]> = { home: [], away: [] },
        public kickoff: I.Drive['kickoff'] = {
            event: { dice: [], total: KICKOFF_RESULT.ChangingWeather, cancelled: true },
            target: { x: -1, y: -1 },
            scatters: [],
            checkpoint: { playerStates: [] },
        },
        public turns: Turn[] = [],
        public initialScore: I.ByTeam<number> = { home: 0, away: 0 },
        public finalScore: I.ByTeam<number> = { home: 0, away: 0 },
    ) {
    }
}

class Turn {
    constructor(
        public number: number,
        public side: keyof I.ByTeam<any>,
        public checkpoint: I.Checkpoint,
        public activations: Activation[] = [],
        public startWizard?: I.WizardRoll,
        public endWizard?: I.WizardRoll,
    ) { }
}

class Activation {
    constructor(
        public playerId: I.PlayerId,
        public checkpoint: I.Checkpoint,
        public test?: I.ActivationTest,
        public action: I.Action = {
            actionType: ACTION_TYPE.Move,
            player: { number: 0, side: "home" },
            path: [],
        },
        public actionSteps: I.ActionStep[] = [],
    ) { }
}

export function convertCell(c: B.Cell): I.Cell {
    if (!c) {
        return { x: 0, y: 0 };
    } else {
        return {
            x: c.x || 0,
            y: c.y || 0
        };
    }
}

export function convertReplay(incoming: DeepReadonly<B.Replay>): DeepReadonly<I.Replay> {
    const outgoing: Replay = new Replay([...incoming.ReplayStep]);
    outgoing.metadata.filename = incoming.filename;
    outgoing.metadata.url = incoming.url;
    outgoing.processSteps();
    console.log("Finished converting", { outgoing });
    return outgoing;
}

function badResult(result: never): never
function badResult(result: B.BaseResult) {
    console.error({ msg: 'Unhandled result', result });
}

function badStep(stepIdx: number, step: never): never
function badStep(stepIdx: number, step: DeepReadonly<B.ReplayStep>) {
    console.error({ msg: `Unhandled step ${stepIdx}`, step });
}

function last<T>(xs: T[]): T | undefined {
    if (xs.length == 0) {
        return undefined;
    } else {
        return xs[xs.length - 1];
    }
}

export function convertSide(s: SIDE): I.Side {
    return s == SIDE.home ? 'home' : 'away';
}

export function playerNumberToSide(n: I.PlayerNumber): I.Side {
    return n < 30 ? 'home' : 'away';
}

export function convertPlayerDefinition(p: B.PitchPlayer): DeepWritable<I.Player> {
    return {
        id: {
            number: p.Id,
            side: playerNumberToSide(p.Id),
        },
        skills: translateStringNumberList(p.Data.ListSkills),
        type: getPlayerType(p.Data.IdPlayerTypes),
        name: he.decode(p.Data.Name.toString()),
        stats: {
            ma: p.Data.Ma,
            st: p.Data.St,
            av: p.Data.Av,
            ag: p.Data.Ag,
        }
    };
}

export function convertPlayerState(t: B.TeamState, p: B.PitchPlayer): I.PlayerState {
    return {
        usedSkills: translateStringNumberList(p.ListUsedSkills),
        canAct: p.CanAct == 1,
        status: p.Status || STATUS.standing,
        disabled: p.Disabled == 1,
        blitzer: t.BlitzerId == p.Id,
        situation: p.Situation || SITUATION.Active,
        casualties: translateStringNumberList(p.ListCasualties),
        pitchCell: convertCell(p.Cell)
    };
}

function convertDiceModifier(modifier: B.DiceModifier): I.DiceModifier {
    const result: I.DiceModifier = {};
    if (modifier.Cell) {
        result.cell = convertCell(modifier.Cell);
    }
    if (modifier.Skill && modifier.Skill >= 0) {
        result.skill = modifier.Skill;
    }
    if (modifier.Type) {
        result.type = modifier.Type;
    }
    if (modifier.Value) {
        result.value = modifier.Value;
    }
    return result;
}

function convertDiceRollResult<R>(result: B.DiceRollResult<R, B.Skills, B.Cells>): I.DiceRoll {
    const roll: I.DiceRoll = {
        dice: translateStringNumberList(result.CoachChoices.ListDices),
        modifiers: ensureKeyedList("DiceModifier", result.ListModifiers).map(modifier => convertDiceModifier(modifier))
    };
    if ('Requirement' in result) {
        roll.target = result.Requirement;
    }
    return roll;
}