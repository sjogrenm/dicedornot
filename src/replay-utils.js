
export const END = {
  end: true,
  before: () => false,
  after: () => true,
  equal: (other) => other === END,
  atOrAfter: () => false,
  atOrBefore: (other) => other === END,
  toNextPosition: () => new ReplayPosition(),
};

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

export const REPLAY_SUB_STEP = {
  SetupAction: 1,
  Kickoff: 2,
  BoardAction: 3,
  EndTurn: 4,
  BoardState: 5,
  NextReplayStep: 6,
}

export const REPLAY_KEY = {
  [REPLAY_SUB_STEP.SetupAction]: 'RulesEventSetUpAction',
  [REPLAY_SUB_STEP.Kickoff]: 'RulesEventKickOffTable',
  [REPLAY_SUB_STEP.BoardAction]: 'RulesEventBoardAction',
  [REPLAY_SUB_STEP.EndTurn]: 'RulesEventEndTurn',
  [REPLAY_SUB_STEP.BoardState]: 'BoardState',
}


function nextState(replayStep, subStep) {
  for (var nextSubStep = subStep; nextSubStep < REPLAY_SUB_STEP.NextReplayStep; nextSubStep++) {
    if (replayStep[REPLAY_KEY[nextSubStep]]) {
      return nextSubStep;
    }
  }
  return REPLAY_SUB_STEP.NextReplayStep;
}
export class ReplayPosition {
  step = 0;
  subStep = REPLAY_SUB_STEP.SetupAction;
  action = null;
  result = null;

  constructor(step, subStep, action, result) {
    this.step = step || 0;
    this.subStep = subStep || REPLAY_SUB_STEP.SetupAction;
    this.action = action;
    this.result = result;
  }

  toString() {
    if (this.subStep == REPLAY_SUB_STEP.BoardAction) {
      return `Step-${this.step}.${REPLAY_KEY[this.subStep]}.${this.action}.${this.result}`;
    } else {
      return `Step-${this.step}.${REPLAY_KEY[this.subStep]}`;
    }
  }

  toNextPosition(replay) {
    const replayStep = replay.ReplayStep[this.step];
    if (this.subStep == REPLAY_SUB_STEP.BoardAction) {
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
    const next = nextState(replayStep, this.subStep + 1);
    if (next == REPLAY_SUB_STEP.NextReplayStep) {
      this.step += 1;
      if (this.step >= replay.ReplayStep.length) {
        return END;
      }
      this.subStep = nextState(replay.ReplayStep[this.step], REPLAY_SUB_STEP.SetupAction);
    } else {
      this.subStep = next;
    }
    if (this.subStep == REPLAY_SUB_STEP.BoardAction) {
      this.action = this.result = 0;
    } else {
      this.action = this.result = null;
    }
    return this;
  }

  after(other) {
    if (!other) {
      throw new Error("Can't compare ReplayPosition to undefined", { this: this, other })
    }
    if (other === END) {
      return false;
    }
    if (this.step > other.step) {
      return true;
    }
    if (this.step < other.step) {
      return false;
    }
    if (this.subStep > other.subStep) {
      return true;
    }
    if (this.subStep < other.subStep) {
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
      throw new Error("Can't compare ReplayPosition to undefined", { this: this, other })
    }
    if (other === END) {
      return false;
    }
    return (this.step == other.step && this.subStep == other.subStep && this.action == other.action && this.result == other.result);
  }
  atOrAfter(other) {
    return this.after(other) || this.equal(other);
  }
  before(other) {
    return other.after(this);
  }
  atOrBefore(other) {
    return other.atOrBefore(this);
  }
  toParam() {
    if (this.subStep === REPLAY_SUB_STEP.BoardAction) {
      return [this.step, this.subStep, this.action, this.result].join('-');
    } else {
      return [this.step, this.subStep].join('-');
    }
  }
  static fromParam(value) {
    let [step, subStep, action, result] = value.split('-').map(x => parseInt(x));
    return new ReplayPosition(step, subStep, action, result);
  }
}


export function period(turn) {
  return Math.floor((turn - 1) / 8) + 1;
}
