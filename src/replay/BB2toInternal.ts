import { RACE_ID, SIDE } from '../constants.js';
import * as B from './BB2.js';
import type * as I from './Internal.js';
import { cellEq } from './Internal.js';
import he from 'he';
import { ensureList } from '../replay-utils.js';

function requireValue<T>(v: T | undefined, msg: string): T {
    if (v === undefined) {
        throw new Error(msg);
    }
    return v;
}

class Replay {
    constructor(
        public unhandledSteps: B.ReplayStep[],
        public teams: I.ByTeam<Team> = { home: new Team(), away: new Team() },
        public stadium: Partial<I.Replay['stadium']> = {},
        public drives: Drive[] = [],
        private foundUnhandledStep = false,
        public finalScore: I.ByTeam<number> = {home: 0, away: 0},
        public metadata: Partial<I.Replay['metadata']> = {},
    ) { }

    finalize(): I.Replay {
        return {
            ...this,
            teams: {
                home: this.teams.home.finalize(),
                away: this.teams.away.finalize(),
            },
            stadium: {
                ...this.stadium,
                name: requireValue(this.stadium.name, `Missing stadium.name in ${JSON.stringify(this)}`),
                type: requireValue(this.stadium.type, `Missing stadium.type in ${JSON.stringify(this)}`),
            },
            drives: this.drives.map(drive => drive.finalize()),
            finalScore: this.finalScore,
            metadata: {
                ...this.metadata,
                datePlayed: requireValue(this.metadata.datePlayed, `Missing metadata.datePlayed in ${JSON.stringify(this)}`),
            }
        };
    }

    processSteps(incoming: B.Replay) {
        // Handle un-ordered replay steps
        for (let step of this.unhandledSteps) {
            if ('RulesEventGameFinished' in step) {
                this.handleGameFinishedStep(step);
            } else if ('GameInfos' in step) {
                this.handleGameInfo(step);
            }
        }
        while (!this.foundUnhandledStep && this.unhandledSteps.length > 0) {
            let step = this.unhandledSteps.shift()!;
            if ('RulesEventGameFinished' in step || 'GameInfos' in step) {
                // Handled as an unordered replay step
            } else if ('RulesEventAddInducementSkill' in step) {
                this.handleAddInducementSkillStep(step);
            } else if ('RulesEventSetUpAction' in step) {
                this.handleSetUpAction(step);
            } else if ('RulesEventSetUpConfiguration' in step) {
                this.cantHandle(step);
            } else if ('RulesEventSetGeneratedPersonnalities' in step) {
                // don't need to handle this
            } else if (
                'RulesEventApplyInducements' in step ||
                'RulesEventAddMercenary' in step ||
                'RulesEventAddInducement' in step ||
                'RulesEventInducementsInfos' in step
            ) {
                this.handleAddInducementStep(step);
            } else if (
                'BoardState' in step
            ) {
                this.handleGameTurnStep(step);
            } else {
                badStep(step);
            }
        }
    }

    handleGameFinishedStep(step: B.GameFinishedStep) {
        this.finalScore.home = step.RulesEventGameFinished.MatchResult.Row.HomeScore || 0;
        this.finalScore.away = step.RulesEventGameFinished.MatchResult.Row.AwayScore || 0;
        this.metadata.datePlayed = new Date(step.RulesEventGameFinished.MatchResult.Row.Finished);
    }
    
    handleAddInducementStep(step: B.AddInducementStep) {
        if ('RulesEventAddMercenary' in step) {
            this.cantHandle(step);
        }
        if ('RulesEventAddInducement' in step) {
            this.cantHandle(step);
        }
        if ('RulesEventRemoveInducement' in step) {
            this.cantHandle(step);
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

    handleAddInducementSkillStep(step: B.AddInducementSkillStep) {
        let player = step.RulesEventAddInducementSkill.MercenaryId;
        let side = B.playerIdSide(player);
        let skill = step.RulesEventAddInducementSkill.SkillId;
        let team = this.teams[side == SIDE.home ? 'home' : 'away'];
        team.inducements.mercenaries[player].skills.push(skill);
        team.players[player].skills.push(skill);
    }
    
    handleGameInfo(step: B.GameInfoStep) {
        this.stadium.name = he.decode(step.GameInfos.NameStadium.toString());
        this.stadium.type = step.GameInfos.Stadium;
        this.stadium.enhancement = step.GameInfos.StructStadium;
    
        this.teams.home.coach = he.decode(ensureList(step.GameInfos.CoachesInfos.CoachInfos)[SIDE.home].UserId.toString());
        this.teams.away.coach = he.decode(ensureList(step.GameInfos.CoachesInfos.CoachInfos)[SIDE.away].UserId.toString());
        this.teams.home.race = step.BoardState.ListTeams.TeamState[SIDE.home].Data.IdRace;
        this.teams.away.race = step.BoardState.ListTeams.TeamState[SIDE.away].Data.IdRace;
        this.teams.home.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.home].Data.Name.toString());
        this.teams.away.name = he.decode(step.BoardState.ListTeams.TeamState[SIDE.away].Data.Name.toString());

        this.metadata.league = step.GameInfos.RowLeague.Name && he.decode(step.GameInfos.RowLeague.Name.toString());
    }
    
    handleSetUpAction(step: B.SetUpActionStep) {
        const fromCell = convertCell(step.RulesEventSetUpAction.PlayerPosition);
        const toCell = convertCell(step.RulesEventSetUpAction.NewPosition);
        const alsoMove = step.RulesEventSetUpAction.Substitute;
        const side = convertSide(step.RulesEventWaitingRequest == '' ? SIDE.home : step.RulesEventWaitingRequest.ConcernedTeam || SIDE.home);
        let currentDrive: Drive = this.drives.pop() || new Drive();
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
        this.drives.push(currentDrive);
    }
    
    handleGameTurnStep(step: B.GameTurnStep) {
        this.cantHandle(step);
    }

    cantHandle(step: B.ReplayStep) {
        this.unhandledSteps.unshift(step);
        this.foundUnhandledStep = true;
    }
}

class Team {
    constructor(
        public players: Record<I.PlayerNumber, I.Player> = {},
        public inducements: I.Inducements = { mercenaries: [] },
        public race?: RACE_ID,
        public coach?: string,
        public name?: string,
    ) { }

    finalize(): I.Team {
        return {
            ...this,
            race: requireValue(this.race, `Missing race in ${JSON.stringify(this)}`),
            coach: requireValue(this.coach, `Missing coach in ${JSON.stringify(this)}`),
            name: requireValue(this.name, `Missing name in ${JSON.stringify(this)}`),
        };
    }
}

class Drive implements I.Checkpoint {
    constructor(
        public wakeups: I.ByTeam<I.WakeupRoll[]> = { home: [], away: [] },
        public setup: I.ByTeam<I.SetupAction[]> = { home: [], away: [] },
        public kickoff?: I.KickoffRoll,
        public turns: I.Turn[] = [],
        public _checkpointData?: any,
    ) {
    }

    finalize(): I.Drive {
        return {
            ...this,
            kickoff: requireValue(this.kickoff, `Missing kickoff in ${JSON.stringify(this)}`)
        };
    }
}



function emptySetup(): I.SetupAction {
    return {
        players: new Map(),
        movedPlayers: new Map(),
    };
}

export function convertCell(c: B.Cell): I.Cell {
    if (!c) {
        return {x: 0, y: 0};
    } else {
        return {
            x: c.x || 0,
            y: c.y || 0
        };
    }
}

export function convertReplay(incoming: B.Replay): I.Replay {
    let outgoing: Replay = new Replay(incoming.ReplayStep);
    outgoing.processSteps(incoming);
    return outgoing.finalize();
}

function badStep(step: never): never
function badStep(step: B.ReplayStep) {
    console.error(`Unhandled step ${JSON.stringify(step)}`);
}

function last<T>(xs: T[]): T | undefined {
    if (xs.length == 0) {
        return undefined;
    } else {
        return xs[xs.length - 1];
    }
}

function convertSide(s: SIDE): I.Side {
    return s == SIDE.home ? 'home' : 'away';
}