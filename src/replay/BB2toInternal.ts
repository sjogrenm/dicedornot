import { SIDE } from '../constants.js';
import * as BB2 from './BB2.js';
import type * as Internal from './Internal.js';
import {cellEq} from './Internal.js';
import he from 'he';

export function convertCell(c: BB2.Cell): Internal.Cell {
    if (c === "") {
        return {x: 0, y: 0};
    } else {
        return {
            x: c.x || 0,
            y: c.y || 0
        };
    }
}

export function convertReplay(incoming: BB2.Replay): Internal.Replay {
    let outgoing: Internal.Replay = {
        teams: {
            home: {
                players: {},
                inducements: {
                    mercenaries: {},
                },
                race: null,
                coach: "Unknown",
                name: "Unknown",
            },
            away: {
                players: {},
                inducements: {
                    mercenaries: {},
                },
                race: null,
                coach: "Unknown",
                name: "Unknown",
            },
        },
        stadium: {
            name: "Unknown Stadium",
            type: "Unknown Stadium Type"
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
        } else {
            badStep(step);
        }
    }
    return outgoing;
}

function badStep(step: never): never
function badStep(step: BB2.ReplayStep) {
    console.error(`Unhandled step ${JSON.stringify(step)}`);
}

function handleGameFinishedStep(outgoing: Internal.Replay, step: BB2.GameFinishedStep) {
}

function handleAddInducementSkillStep(outgoing: Internal.Replay, step: BB2.AddInducementSkillStep) {
    let player = step.RulesEventAddInducementSkill.MercenaryId;
    let side = BB2.playerIdSide(player);
    let skill = step.RulesEventAddInducementSkill.SkillId;
    let team = outgoing.teams[side == SIDE.home ? 'home' : 'away'];
    team.inducements.mercenaries[player].skills.push(skill);
    team.players[player].skills.push(skill);
}

function handleGameInfo(outgoing: Internal.Replay, step: BB2.GameInfoStep) {
    outgoing.stadium.name = he.decode(step.GameInfos.NameStadium.toString());
    outgoing.stadium.type = step.GameInfos.Stadium;
    outgoing.stadium.enhancement = step.GameInfos.StructStadium;

    outgoing.teams.home.coach = he.decode(step.GameInfos.CoachesInfos.CoachInfos[SIDE.home].UserId.toString());
    outgoing.teams.away.coach = he.decode(step.GameInfos.CoachesInfos.CoachInfos[SIDE.away].UserId.toString());
    outgoing.teams.home.race = step.BoardState.ListTeams.TeamState[SIDE.home].Data.IdRace;
    outgoing.teams.away.race = step.BoardState.ListTeams.TeamState[SIDE.away].Data.IdRace;
    outgoing.teams.home.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.home].Data.Name.toString());
    outgoing.teams.away.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.away].Data.Name.toString());
}

function handleSetUpAction(outgoing: Internal.Replay, step: BB2.SetUpActionStep) {
    const fromCell = convertCell(step.RulesEventSetUpAction.PlayerPosition);
    const toCell = convertCell(step.RulesEventSetUpAction.NewPosition);
    const alsoMove = step.RulesEventSetUpAction.Substitute;
    const side = convertSide(step.RulesEventWaitingRequest == '' ? SIDE.home : step.RulesEventWaitingRequest.ConcernedTeam);
    const currentDrive = last(outgoing.drives);
    const latestSetup = last(currentDrive.setup[side]);
    const players = new Map(latestSetup.players);
    latestSetup.movedPlayers.forEach((position, id) => players.set(id, position));

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
}

function last<T>(xs: T[]): T {
    if (xs.length == 0) {
        return null;
    } else {
        return xs[xs.length-1];
    }
}

function convertSide(s: SIDE): Internal.Side {
    return s == SIDE.home ? 'home' : 'away';
}