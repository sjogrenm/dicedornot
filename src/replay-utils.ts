import { append } from 'svelte/internal';
import type { ReplayStep, Replay, MList, KeyedMList, RulesEventBoardAction } from './replay/BB2.js';

export const END: ReplayPosition = {
  end: true,
};

export function ensureList<T>(objOrList: MList<T> | undefined): T[] {
  if (objOrList && objOrList instanceof Array) {
    return objOrList;
  } else if (objOrList) {
    return [objOrList as T];
  } else {
    return [];
  }
}

export function ensureKeyedList<K extends string, T>(key: K, obj: KeyedMList<K, T>): T[] {
  if (obj == "") {
    return [];
  }
  let v: MList<T> = obj[key];
  return ensureList(v);
}

export function translateStringNumberList(str: string | number | undefined): number [] {
  if (str === undefined || str === null) return [];
  str = str.toString();

  var stripped = str.replace(/[()]/g, '');
  var textList = stripped.split(",");

  var numberList = [];
  for (var i = 0; i < textList.length; i++) {
    numberList.push(parseInt(textList[i]));
  }
  return numberList;
}

export enum REPLAY_SUB_STEP {
  SetupAction = 1,
  Kickoff = 2,
  BoardAction = 3,
  EndTurn = 4,
  BoardState = 5,
  NextReplayStep = 6,
}

export const REPLAY_KEY: Record<Exclude<REPLAY_SUB_STEP, REPLAY_SUB_STEP.NextReplayStep>, string> = {
  [REPLAY_SUB_STEP.SetupAction]: 'RulesEventSetUpAction',
  [REPLAY_SUB_STEP.Kickoff]: 'RulesEventKickOffTable',
  [REPLAY_SUB_STEP.BoardAction]: 'RulesEventBoardAction',
  [REPLAY_SUB_STEP.EndTurn]: 'RulesEventEndTurn',
  [REPLAY_SUB_STEP.BoardState]: 'BoardState',
}


export function nextState(replayStep: ReplayStep, subStep: REPLAY_SUB_STEP) {
  for (var nextSubStep = subStep; nextSubStep < REPLAY_SUB_STEP.NextReplayStep; nextSubStep++) {
    if (nextSubStep == REPLAY_SUB_STEP.NextReplayStep) {
      return REPLAY_SUB_STEP.NextReplayStep;
    } else {
      if (REPLAY_KEY[nextSubStep] as string in replayStep) {
        return nextSubStep;
      }
    }
  }
  return REPLAY_SUB_STEP.NextReplayStep;
}

export function initialReplayPosition(): ReplayPosition {
  return {
    end: false,
    subStep: REPLAY_SUB_STEP.SetupAction,
    step: 0,
  }
}

export type ReplayPosition =
| {
  end: true
}
| {
  end: false,
  step: number,
  subStep: REPLAY_SUB_STEP.BoardAction,
  action: number,
  result: number,
}
| {
  end: false,
  step: number,
  subStep: Exclude<REPLAY_SUB_STEP, REPLAY_SUB_STEP.BoardAction>
}

export interface ReplayPreview {
  start: ReplayPosition,
  end: ReplayPosition,
}

export function toString(position: ReplayPosition) {
  if (position.end) {
    return `End`;
  } else if (position.subStep == REPLAY_SUB_STEP.BoardAction) {
    return `Step-${position.step}.${REPLAY_KEY[position.subStep]}.${position.action}.${position.result}`;
  } else if (position.subStep == REPLAY_SUB_STEP.NextReplayStep) {
    return `Step-${position.step}.Next`;
  } else {
    return `Step-${position.step}.${REPLAY_KEY[position.subStep]}`;
  }
}

export function updateToNextPosition(replay: Replay, position: ReplayPosition) {
  if (position.end) {
    return;
  }
  const replayStep = replay.ReplayStep[position.step];
  if (position.subStep == REPLAY_SUB_STEP.BoardAction) {
    const actions = 'RulesEventBoardAction' in replayStep && replayStep.RulesEventBoardAction ? ensureList(replayStep.RulesEventBoardAction) : [];
    let action = actions[position.action];
    const results = action.Results ? ensureList(action.Results.BoardActionResult) : [];
    if (position.result + 1 < results.length) {
      position.result += 1;
      return position;
    }
    if (position.action + 1 < actions.length) {
      position.result = 0;
      position.action += 1;
      return position;
    }
  }
  const next = nextState(replayStep, position.subStep + 1);
  if (next == REPLAY_SUB_STEP.NextReplayStep) {
    position.step += 1;
    if (position.step >= replay.ReplayStep.length) {
      return END;
    }
    position.subStep = nextState(replay.ReplayStep[position.step], REPLAY_SUB_STEP.SetupAction);
  } else {
    position.subStep = next;
  }
  if (position.subStep == REPLAY_SUB_STEP.BoardAction) {
    position.action = position.result = 0;
  }
  return position;
}

export function after(first: ReplayPosition, second: ReplayPosition) {
  if (!second) {
    throw new Error("Can't compare ReplayPosition to undefined")
  }
  if (second.end) {
    return false;
  }
  if (first.end) {
    return true;
  }
  if (first.step > second.step) {
    return true;
  }
  if (first.step < second.step) {
    return false;
  }
  if (first.subStep > second.subStep) {
    return true;
  }
  if (first.subStep < second.subStep) {
    return false;
  }
  if (first.subStep == REPLAY_SUB_STEP.BoardAction && second.subStep == REPLAY_SUB_STEP.BoardAction) {
    if (first.action > second.action) {
      return true;
    }
    if (first.action < second.action) {
      return false;
    }
    if (first.result > second.result) {
      return true;
    }
    if (first.result < second.result) {
      return false;
    }
  }
  return false;
}

export function equal(first: ReplayPosition, second: ReplayPosition) {
  if (first.end && second.end) {
    return true;
  }
  if (!first.end && !second.end) {
    if (first.subStep == REPLAY_SUB_STEP.BoardAction && second.subStep == REPLAY_SUB_STEP.BoardAction) {
      return (first.step == second.step && first.subStep == second.subStep && first.action == second.action && first.result == second.result);
    } else {
      return (first.step == second.step && first.subStep == second.subStep);
    }
  } else {
    return false;
  }
}

export function atOrAfter(first: ReplayPosition, second: ReplayPosition) {
  return after(first, second) || equal(first, second);
}
export function before(first: ReplayPosition, second: ReplayPosition) {
  return after(second, first);
}
export function atOrBefore(first: ReplayPosition, second: ReplayPosition) {
  return atOrAfter(second, first);
}
export function toParam(position: ReplayPosition): string {
  if (position.end) {
    return 'end';
  } else if (position.subStep === REPLAY_SUB_STEP.BoardAction) {
    return [position.step, position.subStep, position.action, position.result].join('-');
  } else {
    return [position.step, position.subStep].join('-');
  }
}
export function fromParam(value: string): ReplayPosition {
  if (value == 'end') {
    return {end: true};
  }
  let [step, subStep, action, result] = value.split('-').map(x => parseInt(x));
  return {end: false, step, subStep, action, result};
}

export function sliceStepsTo(replay: Replay, start: ReplayPosition, end: ReplayPosition) {
  if (start.end) {
    return [];
  }
  if (end.end) {
    return replay.ReplayStep.slice(start.step);
  }
  return replay.ReplayStep.slice(start.step, end.step == start.step ? end.step + 1 : end.step);
}
export function sliceActionsTo(replay: Replay, start: ReplayPosition, end: ReplayPosition): {step: ReplayStep, action: RulesEventBoardAction}[] {
  if (start.end) {
    return [];
  }

  if (!end.end && start.step == end.step) {
    let startAction = 'action' in start ? start.action : 0;
    let endAction = 'action' in end ? end.action : undefined
    let startStep = replay.ReplayStep[start.step];
    if ('RulesEventBoardAction' in startStep) {
      let actions: RulesEventBoardAction[] = ensureList(startStep.RulesEventBoardAction)
      return actions
        .slice(startAction || 0, endAction)
        .map(action => ({ step: startStep, action }));
    } else {
      return [];
    }
  } else {
    let endStep = 'step' in end ? end.step + 1 : undefined;
    return replay.ReplayStep.slice(start.step, endStep).flatMap((step: ReplayStep, stepIdx: number) => {
      if ('RulesEventBoardAction' in step) {
        let startAction = 'action' in start ? start.action : 0;
        if (stepIdx == 0) {
          return ensureList(step.RulesEventBoardAction).slice(startAction).map(action => ({ step, action }));
        } else if (start.step + stepIdx == endStep) {
          let endAction = 'action' in end ? end.action : undefined;
          return ensureList(step.RulesEventBoardAction).slice(0, endAction).map(action => ({ step, action }));
        } else {
          return ensureList(step.RulesEventBoardAction).map(action => ({ step, action }));
        }
      } else {
        return [];
      }
    })
  }
}

export function period(turn: number): number {
  return Math.floor((turn - 1) / 8) + 1;
}
