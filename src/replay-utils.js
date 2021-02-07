
export function ensureList(objOrList) {
    if (objOrList && objOrList.length) {
        return objOrList;
    } else if (objOrList) {
        return [objOrList];
    } else {
        return [];
    }
}

export function translateStringNumberList(str) {
    if (!str) return [];

    var stripped = str.substring(1, str.length - 1);
    var textList = stripped.split(",");

    var numberList = [];
    for (var i = 0; i < textList.length; i++) {
        numberList.push(parseInt(textList[i]));
    }
    return numberList;
}

export const REPLAY_STEP = {
  SetupAction: 1,
  BoardAction: 2,
  EndTurn: 3,
  BoardState: 4,
  NextReplayStep: 5,
}

export const REPLAY_KEY = {
  [REPLAY_STEP.SetupAction]: 'RulesEventSetupAction',
  [REPLAY_STEP.BoardAction]: 'RulesEventBoardAction',
  [REPLAY_STEP.EndTurn]: 'RulesEventEndTurn',
  [REPLAY_STEP.BoardState]: 'BoardState',
}


function nextState(replayStep, start) {
  let next = start;
  if (next == REPLAY_STEP.NextReplayStep) {
    return next;
  }
  if (replayStep[REPLAY_KEY[next]]) {
    return next;
  } else {
    return nextState(replayStep, next + 1);
  }
}
export class ReplayPosition {
  step = 0;
  state = REPLAY_STEP.SetupAction;
  action = null;
  result = null;

  constructor(step, state, action, result) {
    this.step = step || 0;
    this.state = state || REPLAY_STEP.SetupAction;
    this.action = action;
    this.result = result;
  }

  toString() {
    if (this.state == REPLAY_STEP.BoardAction) {
      return `Step-${this.step}.${REPLAY_KEY[this.state]}.${this.action}.${this.result}`;
    } else {
      return `Step-${this.step}.${REPLAY_KEY[this.state]}`;
    }
  }

  toNextPosition(replay) {
    const replayStep = replay.ReplayStep[this.step];
    if (this.state == REPLAY_STEP.BoardAction) {
      const actions = ensureList(replayStep.RulesEventBoardAction);
      const results = ensureList(actions[this.action].Results.BoardActionResult);
      if (this.result + 1 < results.length) {
        this.result += 1;
        return this;
      }
      if (this.action + 1 < actions.length) {
        this.result = 0;
        this.action += 1;
        return this;
      }
    }
    const next = nextState(replayStep, this.state + 1);
    if (next == REPLAY_STEP.NextReplayStep) {
      this.step += 1;
      this.state = nextState(replay.ReplayStep[this.step], REPLAY_STEP.SetupAction);
    } else {
      this.state = next;
    }
    if (this.state == REPLAY_STEP.BoardAction) {
      this.action = this.result = 0;
    } else {
      this.action = this.result = null;
    }
    return this;
  }

  after(other) {
    if (!other) {
      return false;
    }
    if (this.step > other.step) {
      return true;
    }
    if (this.step < other.step) {
      return false;
    }
    if (this.state > other.state) {
      return true;
    }
    if (this.state < other.state) {
      return false;
    }
    if (this.action > other.action) {
      return true;
    }
    if (this.action < other.action) {
      return false;
    }
    if (this.result > other.result) {
      return true;
    }
    if (this.result < other.result) {
      return false;
    }
    return false;
  }
  equal(other) {
    if (!other) {
      return false;
    }
    return (this.step == other.step && this.state == other.state && this.action == other.action && this.result == other.result);
  }
  atOrAfter(other) {
    if (!other) {
      return false;
    }
    return this.after(other) || this.equal(other);
  }
}
