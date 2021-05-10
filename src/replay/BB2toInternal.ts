import { RACE_ID, SIDE } from '../constants.js';
import * as B from './BB2.js';
import type * as I from './Internal.js';
import {cellEq} from './Internal.js';
import he from 'he';
import {ensureList} from '../replay-utils.js';

interface _Replay {
    teams: I.ByTeam<_Team>,
    stadium: {
        name?: string,
        type?: string,
        enhancement?: string,
    },
    drives: _Drive[],
}

interface _Team {
    players: Record<I.PlayerNumber, I.Player>,
    inducements: I.Inducements,
    race?: RACE_ID,
    coach?: string,
    name?: string,
}

interface _Drive extends I.Checkpoint {
    wakeups: I.ByTeam<I.WakeupRoll[]>;
    setup: I.ByTeam<I.SetupAction[]>;
    kickoff?: I.KickoffRoll;
    turns: I.Turn[];
}

function emptyDrive(): _Drive {
    return {
        wakeups: {
            home: [],
            away: [],
        },
        setup: {
            home: [],
            away: [],
        },
        kickoff: undefined,
        turns: [],
    }
}

function finalizeValue<T>(v: T | undefined, msg: string): T {
    if (v === undefined) {
        throw new Error(msg);
    }
    return v;
}

function finalizeReplay(replay: _Replay): I.Replay {
    return {
        ...replay,
        teams: {
            home: finalizeTeam(replay.teams.home),
            away: finalizeTeam(replay.teams.away),
        },
        stadium: {
            ...replay.stadium,
            name: finalizeValue(replay.stadium.name, `Missing stadium.name in ${JSON.stringify(replay)}`),
            type: finalizeValue(replay.stadium.type, `Missing stadium.type in ${JSON.stringify(replay)}`),
        },
        drives: replay.drives.map(drive => finalizeDrive(drive)),
    };
}

function finalizeTeam(team: _Team): I.Team {
    return {
        ...team,
        race: finalizeValue(team.race, `Missing race in ${JSON.stringify(team)}`),
        coach: finalizeValue(team.coach, `Missing coach in ${JSON.stringify(team)}`),
        name: finalizeValue(team.name, `Missing name in ${JSON.stringify(team)}`),
    };
}

function finalizeDrive(drive: _Drive): I.Drive {
    return {
        ...drive,
        kickoff: finalizeValue(drive.kickoff, `Missing kickoff in ${JSON.stringify(drive)}`)
    };
}

function emptySetup(): I.SetupAction {
    return {
        players: new Map(),
        movedPlayers: new Map(),
    };
}

export function convertCell(c: B.Cell): I.Cell {
    if (c === "") {
        return {x: 0, y: 0};
    } else {
        return {
            x: c.x || 0,
            y: c.y || 0
        };
    }
}

export function convertReplay(incoming: B.Replay): I.Replay {
    let outgoing: _Replay = {
        teams: {
            home: {
                players: {},
                inducements: {
                    mercenaries: {},
                },
            },
            away: {
                players: {},
                inducements: {
                    mercenaries: {},
                },
            },
        },
        stadium: {
        },
        drives: []
    };
    for (const step of incoming.ReplayStep) {
        if ('RulesEventGameFinished' in step) {
            handleGameFinishedStep(outgoing, step);
        } else if ('RulesEventAddInducementSkill' in step) {
            handleAddInducementSkillStep(outgoing, step);
        } else if ('GameInfos' in step) {
            handleGameInfo(outgoing, step);
        } else if ('RulesEventSetUpAction' in step) {
            handleSetUpAction(outgoing, step);
        } else if ('RulesEventSetUpConfiguration' in step) {
        } else if ('RulesEventSetGeneratedPersonnalities' in step) {
        } else if (
            'RulesEventApplyInducements' in step ||
            'RulesEventAddMercenary' in step ||
            'RulesEventAddInducement' in step ||
            'RulesEventInducementsInfos' in step
        ) {
        } else if (
            'BoardState' in step
        ) {
        } else {
            badStep(step);
        }
    }
    return finalizeReplay(outgoing);
}

function badStep(step: never): never
function badStep(step: B.ReplayStep) {
    console.error(`Unhandled step ${JSON.stringify(step)}`);
}

function handleGameFinishedStep(outgoing: _Replay, step: B.GameFinishedStep) {
}

function handleAddInducementSkillStep(outgoing: _Replay, step: B.AddInducementSkillStep) {
    let player = step.RulesEventAddInducementSkill.MercenaryId;
    let side = B.playerIdSide(player);
    let skill = step.RulesEventAddInducementSkill.SkillId;
    let team = outgoing.teams[side == SIDE.home ? 'home' : 'away'];
    team.inducements.mercenaries[player].skills.push(skill);
    team.players[player].skills.push(skill);
}

function handleGameInfo(outgoing: _Replay, step: B.GameInfoStep) {
    outgoing.stadium.name = he.decode(step.GameInfos.NameStadium.toString());
    outgoing.stadium.type = step.GameInfos.Stadium;
    outgoing.stadium.enhancement = step.GameInfos.StructStadium;

    outgoing.teams.home.coach = he.decode(ensureList(step.GameInfos.CoachesInfos.CoachInfos)[SIDE.home].UserId.toString());
    outgoing.teams.away.coach = he.decode(ensureList(step.GameInfos.CoachesInfos.CoachInfos)[SIDE.away].UserId.toString());
    outgoing.teams.home.race = step.BoardState.ListTeams.TeamState[SIDE.home].Data.IdRace;
    outgoing.teams.away.race = step.BoardState.ListTeams.TeamState[SIDE.away].Data.IdRace;
    outgoing.teams.home.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.home].Data.Name.toString());
    outgoing.teams.away.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.away].Data.Name.toString());
}

function handleSetUpAction(outgoing: _Replay, step: B.SetUpActionStep) {
    const fromCell = convertCell(step.RulesEventSetUpAction.PlayerPosition);
    const toCell = convertCell(step.RulesEventSetUpAction.NewPosition);
    const alsoMove = step.RulesEventSetUpAction.Substitute;
    const side = convertSide(step.RulesEventWaitingRequest == '' ? SIDE.home : step.RulesEventWaitingRequest.ConcernedTeam || SIDE.home);
    let currentDrive: _Drive = outgoing.drives.pop() || emptyDrive();
    let latestSetup = last(currentDrive.setup[side]);
    let players: Map<I.PlayerNumber, I.Cell>;
    if (latestSetup) {
        players = new Map(latestSetup.players);
        latestSetup.movedPlayers.forEach((position, id) => players.set(id, position));
    } else {
        players = new Map();
    }

    const movedPlayer = [...players.entries()]
        .filter(([id, position]) => cellEq(fromCell, position))
        .map(([id, position]) => id)[0];

    let movedPlayers = new Map([
        [movedPlayer, toCell]
    ]);
    if (alsoMove) {
        movedPlayers.set(alsoMove, fromCell);
    }
    let nextSetup = {
        players,
        movedPlayers
    }
    currentDrive.setup[side].push(nextSetup);
    outgoing.drives.push(currentDrive);
}

function last<T>(xs: T[]): T | undefined {
    if (xs.length == 0) {
        return undefined;
    } else {
        return xs[xs.length-1];
    }
}

function convertSide(s: SIDE): I.Side {
    return s == SIDE.home ? 'home' : 'away';
}