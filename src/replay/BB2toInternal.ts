import { SIDE } from '../constants.js';
import * as BB2 from './BB2.js';
import type * as Internal from './Internal.js';

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
            },
            away: {
                players: {},
                inducements: {
                    mercenaries: {},
                },
                race: null,
            },
        },
        drives: []
    };
    for (const step of incoming.ReplayStep) {
        if ('RulesEventGameFinished' in step) {
            outgoing = handleGameFinishedStep(outgoing, step);
        } else if ('RulesEventAddInducementSkill' in step) {
            outgoing = handleAddInducementSkillStep(outgoing, step);
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
    return outgoing;
}

function handleAddInducementSkillStep(outgoing: Internal.Replay, step: BB2.AddInducementSkillStep) {
    let player = step.RulesEventAddInducementSkill.MercenaryId;
    let side = BB2.playerIdSide(player);
    let skill = step.RulesEventAddInducementSkill.SkillId;
    let team = outgoing.teams[side == SIDE.home ? 'home' : 'away'];
    team.inducements.mercenaries[player].skills.push(skill);
    team.players[player].skills.push(skill);
    return outgoing;
}