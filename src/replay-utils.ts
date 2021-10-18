import * as BB2 from './replay/BB2.js';
import * as Internal from "./replay/Internal.js";
import parser from 'fast-xml-parser';
import he from 'he';
import type { DeepReadonly } from "ts-essentials";

export type ReplayPosition = DeepReadonly<GameOver | BB2.ReplayPosition | Internal.ReplayPosition>;

export type GameOver = { type: 'gameOver', end: true }

export function gameOver(position: ReplayPosition): position is GameOver {
  return 'end' in position;
}

export function isBB2Position(position: ReplayPosition): position is BB2.ReplayPosition {
  return 'stepIdx' in position;
}

export function isInternalPosition(position: ReplayPosition): position is Internal.ReplayPosition {
  return !(gameOver(position) || isBB2Position(position));
}

export interface ReplayPreview {
  start: number,
  end: number | undefined,
}

export function linearReplay(replay: DeepReadonly<Internal.Replay> & { _linearReplayCache?: ReplayPosition[] }): ReplayPosition[] {
  if (!replay._linearReplayCache) {
    replay._linearReplayCache = new Array(..._linearReplay(replay));
    console.log("Linear Replay Cache", { linear: replay._linearReplayCache });
  }
  return replay._linearReplayCache;
}

function* _linearReplay(replay: Internal.Replay): Generator<ReplayPosition> {
  yield { type: 'gameStart', replay };
  for (const [driveIdx, drive] of replay.drives.entries()) {
    yield { type: 'driveStart', driveIdx, drive }
    for (const wakeupSide of [drive.kickingTeam, Internal.other(drive.kickingTeam)]) {
      for (const [rollIdx, roll] of drive.wakeups[wakeupSide].entries()) {
        yield { type: 'wakeupRoll', driveIdx, wakeupSide, rollIdx, roll };
      }
    }
    for (const setupSide of [drive.kickingTeam, Internal.other(drive.kickingTeam)]) {
      for (const [actionIdx, action] of drive.setups[setupSide].entries()) {
        yield { type: 'setupAction', driveIdx, setupSide, actionIdx, action, checkpoint: action.checkpoint };
      }
    }
    yield { type: 'kickoffTarget', driveIdx, target: drive.kickoff.target, checkpoint: drive.kickoff.checkpoint };
    yield { type: 'kickoffScatter', driveIdx, scatters: drive.kickoff.scatters };
    yield { type: 'kickoffEvent', driveIdx, event: drive.kickoff.event };
    if ('activations' in drive.kickoff.event) {
      for (const [activationIdx, activation] of drive.kickoff.event.activations.entries()) {
        for (const [actionStepIdx, actionStep] of activation.actionSteps.entries()) {
          yield { type: 'actionStep', driveIdx, turnIdx: 'setup', activationIdx, actionStepIdx, actionStep }
        }
      }
    } else if ('setupActions' in drive.kickoff.event) {
      for (const [actionIdx, action] of drive.kickoff.event.setupActions.entries()) {
        yield { type: 'setupAction', driveIdx, setupSide: drive.kickoff.event.setupSide, actionIdx, action, checkpoint: action.checkpoint };
      }
    }
    yield { type: 'kickoffLanding', driveIdx, touchbackTo: drive.kickoff.touchbackTo, catch: drive.kickoff.catch, bounce: drive.kickoff.bounce };
    for (const [turnIdx, turn] of drive.turns.entries()) {
      if (turn.startWizard) {
        yield { type: 'wizardRoll', driveIdx, turnIdx, wizard: 'start', roll: turn.startWizard };
      }
      for (const [activationIdx, activation] of turn.activations.entries()) {
        for (const [actionStepIdx, actionStep] of activation.actionSteps.entries()) {
          yield { type: 'actionStep', driveIdx, turnIdx, activationIdx, actionStepIdx, actionStep }
        }
      }
      if (turn.endWizard) {
        yield { type: 'wizardRoll', driveIdx, turnIdx, wizard: 'end', roll: turn.endWizard };
      }
    }
  }
  for (const [stepIdx, step] of replay.unhandledSteps.entries()) {
    if ('RulesEventSetUpAction' in step) {
      yield { type: 'bb2.setup', stepIdx, subStep: BB2.REPLAY_SUB_STEP.SetupAction, step, setup: step.RulesEventSetUpAction };
    }
    if ('RulesEventKickOffTable' in step && step.RulesEventKickOffTable) {
      yield { type: 'bb2.kickoff', stepIdx, subStep: BB2.REPLAY_SUB_STEP.Kickoff, step, kickoff: step.RulesEventKickOffTable };

      for (const msg of BB2.ensureKeyedList('StringMessage', step.RulesEventKickOffTable.EventResults)) {
        let messageData = parser.parse(he.decode(msg.MessageData), {
          ignoreAttributes: true,
        }) as BB2.KickoffEventMessageData;
        yield { type: 'bb2.kickoffMessage', stepIdx, subStep: BB2.REPLAY_SUB_STEP.Kickoff, step, kickoff: step.RulesEventKickOffTable, kickoffMessage: messageData };
      };
    }
    if ('RulesEventBoardAction' in step) {
      let actions: DeepReadonly<BB2.RulesEventBoardAction[]> = BB2.ensureList(step.RulesEventBoardAction);
      for (const [actionIdx, action] of actions.entries()) {
        if (!action.Results) {
          continue;
        }
        if ('BoardActionResult' in action.Results) {
          // @ts-ignore
          let results: BB2.ActionResult<typeof action>[] = BB2.ensureKeyedList('BoardActionResult', action.Results);
          for (const [resultIdx, result] of results.entries()) {
            yield { type: 'bb2.actionResult', stepIdx, subStep: BB2.REPLAY_SUB_STEP.BoardAction, step, actionIdx, action, resultIdx, result };
          }
        }
      }
    }
    if ('RulesEventEndTurn' in step && step.RulesEventEndTurn) {
      yield { type: 'bb2.endTurn', stepIdx, subStep: BB2.REPLAY_SUB_STEP.EndTurn, step, endTurn: step.RulesEventEndTurn };
    }
    if ('BoardState' in step) {
      yield { type: 'bb2.boardState', stepIdx, subStep: BB2.REPLAY_SUB_STEP.BoardState, step, boardState: step.BoardState };
    }
  }
}

export function period(turn: number): number {
  return Math.floor((turn - 1) / 8) + 1;
}
