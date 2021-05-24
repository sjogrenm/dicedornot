import { Action, MoveAction, UnknownAction } from "./rolls.js";
import { END, ensureList } from "./replay-utils.js";
import { SIDE, RACE_ID } from "./constants.js";
import type * as BB2 from "./replay/BB2.js";
import he from 'he';
import {xmlToJson} from "./io.js";
import { init } from "svelte/internal";
import { initial } from "underscore";

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
  fullReplay: BB2.Replay,
  gameDetails: GameDetails,
  actions: Action[],
  unknownRolls: UnknownAction[],
  version: number,
}

export interface ParsedReplay {
  Replay: BB2.Replay,
}

export function processReplay(data: ParsedReplay): ProcessedReplay {
  //console.log("replay.processReplay");
  //console.log(data);

  const gameDetails = extractGameDetails(data);
  console.log("Extracted game details...", gameDetails);

  let actions: (Action | UnknownAction)[] = [];
  let initialBoardState: BB2.BoardState | undefined;
  for (
    var stepIndex = 0;
    stepIndex < data.Replay.ReplayStep.length;
    stepIndex++
  ) {
    var replayStep = data.Replay.ReplayStep[stepIndex];

    if (!('BoardState' in replayStep)) {
      continue;
    }
    if (initialBoardState === null) {
      initialBoardState = replayStep.BoardState;
    }
    if (initialBoardState) {
      actions = actions.concat(Action.fromReplayStep(
        data.Replay,
        initialBoardState,
        stepIndex,
        replayStep
      ));
    }
    initialBoardState = replayStep.BoardState;
  }
  console.log("Extracted actions...", { actions });
  let validRolls: Action[] = actions.filter((action) => !action.ignore) as Action[];
  console.log("Valid actions...", {validRolls});
  validRolls = validRolls.reduce((actions: Action[], nextAction) => {
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
  validRolls.forEach((action, idx) => {
    action.actionIndex = idx;
    action.endIndex = validRolls[idx + 1] ? validRolls[idx + 1].startIndex : END;
  });
  actions.forEach(action => {
    action.actions = validRolls;
  })
  console.log("Transformed actions...", { validRolls });
  let activationValues: Record<string, Value> = validRolls.reduce((acc: Record<string, Value>, action) => {
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
    fullReplay: data.Replay,
    gameDetails: gameDetails,
    actions: validRolls,
    unknownRolls: (actions.filter(action => action instanceof UnknownAction) as unknown) as UnknownAction[],
    version: 1,
  };
}

interface Value {
  actual: number,
  expected: number,
}

export function extractGameDetails(jsonObject: ParsedReplay): GameDetails {
  var firstStep = jsonObject.Replay.ReplayStep[0] as BB2.GameInfoStep;
  var lastStep =
    jsonObject.Replay.ReplayStep[jsonObject.Replay.ReplayStep.length - 1] as BB2.GameFinishedStep;
  return {
    //fileName: lastStep.RulesEventGameFinished.MatchResult.Row.ReplayFilename,
    stadiumName: he.decode(firstStep.GameInfos.NameStadium.toString()),
    stadiumType: firstStep.GameInfos.StructStadium,
    leagueName: firstStep.GameInfos.RowLeague.Name && he.decode(firstStep.GameInfos.RowLeague.Name.toString()),
    homeTeam: {
      coachName: he.decode(ensureList(firstStep.GameInfos.CoachesInfos.CoachInfos)[SIDE.home].UserId.toString()),
      teamName: he.decode(firstStep.BoardState.ListTeams.TeamState[SIDE.home].Data.Name.toString()),
      raceId: firstStep.BoardState.ListTeams.TeamState[SIDE.home].Data.IdRace,
      score: lastStep.RulesEventGameFinished.MatchResult.Row.HomeScore || 0,
    },
    awayTeam: {
      coachName: he.decode(ensureList(firstStep.GameInfos.CoachesInfos.CoachInfos)[SIDE.away].UserId.toString()),
      teamName: he.decode(firstStep.BoardState.ListTeams.TeamState[SIDE.away].Data.Name.toString()),
      raceId: firstStep.BoardState.ListTeams.TeamState[SIDE.away].Data.IdRace,
      score: lastStep.RulesEventGameFinished.MatchResult.Row.AwayScore || 0,
    },
  };
}


