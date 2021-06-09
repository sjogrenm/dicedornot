import { Action, MoveAction, UnknownAction } from "./rolls.js";
import { END } from "./replay-utils.js";
import type { RACE_ID } from "./constants.js";
import type * as BB2 from "./replay/BB2.js";
import type * as Internal from "./replay/Internal.js";
import he from 'he';
import type {ParsedReplay} from "./types.js";

interface TeamDetails {
  coachName: string,
  teamName: string,
  raceId: RACE_ID,
  score: number,
}
export interface GameDetails {
  //fileName: lastStep.RulesEventGameFinished.MatchResult.Row.ReplayFilename,
  stadiumName: string,
  stadiumType?: string,
  leagueName?: string,
  homeTeam: TeamDetails,
  awayTeam: TeamDetails,
}

export interface ProcessedReplay {
  fullReplay: Internal.Replay,
  actions: Action[],
  unknownRolls: UnknownAction[],
  version: number,
}

export function processReplay(data: ParsedReplay): ProcessedReplay {
  //console.log("replay.processReplay");
  //console.log(data);

  console.log("Extracted game details...", {
    teams: data.replay.teams,
    stadium: data.replay.stadium,
    metadata: data.replay.metadata
  });

  let actions: (Action | UnknownAction)[] = [];
  let initialBoardState: BB2.BoardState | undefined;
  for (
    var stepIndex = 0;
    stepIndex < data.replay.unhandledSteps.length;
    stepIndex++
  ) {
    var replayStep = data.replay.unhandledSteps[stepIndex];

    if (!('BoardState' in replayStep)) {
      continue;
    }
    if (initialBoardState === null) {
      initialBoardState = replayStep.BoardState;
    }
    if (initialBoardState) {
      actions = actions.concat(Action.fromReplayStep(
        data.replay,
        initialBoardState,
        stepIndex,
        replayStep
      ));
    }
    initialBoardState = replayStep.BoardState;
  }
  console.log("Extracted actions...", { actions });
  let validActions: Action[] = actions.filter((action) => !action.ignore) as Action[];
  console.log("Valid actions...", {validActions});
  validActions = validActions.reduce((actions: Action[], nextAction) => {
    if (actions.length == 0) {
      return [nextAction];
    }
    let lastAction = actions[actions.length - 1];
    if (nextAction instanceof MoveAction && lastAction instanceof MoveAction && nextAction.activePlayer.id == lastAction.activePlayer.id && nextAction.turn == lastAction.turn) {
      lastAction.cellTo = nextAction.cellTo;
      return actions;
    }
    let lastDependentRoll = lastAction.dependentActions && lastAction.dependentActions[lastAction.dependentActions.length - 1];
    if (nextAction instanceof MoveAction && lastDependentRoll instanceof MoveAction && nextAction.activePlayer.id == lastDependentRoll.activePlayer.id && nextAction.turn == lastAction.turn) {
      lastDependentRoll.cellTo = nextAction.cellTo;
      return actions;
    }

    if (
      lastAction.isDependentAction(nextAction)
    ) {
      lastAction.dependentActions.push(nextAction);
      nextAction.dependent = {action: lastAction, index: lastAction.dependentActions.length - 1};
      return actions;
    }
    actions.push(nextAction);
    return actions;
  }, []);
  validActions.forEach((action, idx) => {
    action.actionIndex = idx;
    action.endIndex = validActions[idx + 1] ? validActions[idx + 1].startIndex : END;
  });
  actions.forEach(action => {
    action.actions = validActions;
  })
  console.log("Transformed actions...", { validActions });
  let activationValues: Record<string, Value> = validActions.reduce((acc: Record<string, Value>, action) => {
    if (action.activePlayer) {
      acc[`${action.turn}-${action.activePlayer.name}`] = {
        actual: action.valueWithDependents.valueOf(),
        expected: action.onTeamValue(action.activePlayer).valueOf(),
      };
    }
    return acc;
  }, {});
  console.log("Player activation values", {
    activationValues,
    mean: Object.values(activationValues).reduce((acc, value) => acc + value.actual / Object.values(activationValues).length, 0),
    meanExp: Object.values(activationValues).reduce((acc, value) => acc + value.expected / Object.values(activationValues).length, 0)
  });

  return {
    fullReplay: data.replay,
    actions: validActions,
    unknownRolls: (actions.filter(action => action instanceof UnknownAction) as unknown) as UnknownAction[],
    version: 1,
  };
}

interface Value {
  actual: number,
  expected: number,
}


