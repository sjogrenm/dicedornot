import { Roll, MoveAction, UnknownRoll } from "./rolls.js";
import { END } from "./replay-utils.js";
import { SIDE } from "./constants.js";
import type * as BB2 from "./replay/BB2.js";
import he from 'he';
import {xmlToJson} from "./io.js";
import { init } from "svelte/internal";
import { initial } from "underscore";

interface TeamDetails {
  coachName: string,
  teamName: string,
  raceId: number,
  score: number,
}
interface GameDetails {
  //fileName: lastStep.RulesEventGameFinished.MatchResult.Row.ReplayFilename,
  stadiumName: string,
  stadiumType: string,
  leagueName: string,
  homeTeam: TeamDetails,
  awayTeam: TeamDetails,
}

export interface ProcessedReplay {
  fullReplay: BB2.Replay,
  gameDetails: GameDetails,
  rolls: Roll<any>[],
  unknownRolls: UnknownRoll[],
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

  let rolls: (Roll<any> | UnknownRoll)[] = [];
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
      rolls = rolls.concat(Roll.fromReplayStep(
        data.Replay,
        initialBoardState,
        stepIndex,
        replayStep
      ));
    }
    initialBoardState = replayStep.BoardState;
  }
  console.log("Extracted rolls...", { rolls });
  let validRolls: Roll<any>[] = rolls.filter((roll) => !roll.ignore) as Roll<any>[];
  validRolls = validRolls.reduce((rolls: Roll<any>[], nextRoll) => {
    if (rolls.length == 0) {
      return [nextRoll];
    }
    let lastRoll = rolls[rolls.length - 1];
    if (nextRoll instanceof MoveAction && lastRoll instanceof MoveAction && nextRoll.activePlayer.id == lastRoll.activePlayer.id && nextRoll.turn == lastRoll.turn) {
      lastRoll.cellTo = nextRoll.cellTo;
      return rolls;
    }
    let lastDependentRoll = lastRoll.dependentRolls && lastRoll.dependentRolls[lastRoll.dependentRolls.length - 1];
    if (nextRoll instanceof MoveAction && lastDependentRoll instanceof MoveAction && nextRoll.activePlayer.id == lastDependentRoll.activePlayer.id && nextRoll.turn == lastRoll.turn) {
      lastDependentRoll.cellTo = nextRoll.cellTo;
      return rolls;
    }

    if (
      lastRoll.isDependentRoll(nextRoll)
    ) {
      lastRoll.dependentRolls.push(nextRoll);
      nextRoll.dependent = {roll: lastRoll, index: lastRoll.dependentRolls.length - 1};
      return rolls;
    }
    rolls.push(nextRoll);
    return rolls;
  }, []);
  validRolls.forEach((roll, idx) => {
    roll.rollIndex = idx;
    roll.endIndex = validRolls[idx + 1] ? validRolls[idx + 1].startIndex : END;
  });
  rolls.forEach(roll => {
    roll.rolls = validRolls;
  })
  console.log("Transformed rolls...", { validRolls });
  let activationValues: Record<string, Value> = validRolls.reduce((acc: Record<string, Value>, roll) => {
    if (roll.activePlayer) {
      acc[`${roll.turn}-${roll.activePlayer.name}`] = {
        actual: roll.valueWithDependents.valueOf(),
        expected: roll.onTeamValue(roll.activePlayer).valueOf(),
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
    rolls: validRolls,
    unknownRolls: (rolls.filter(roll => roll instanceof UnknownRoll) as unknown) as UnknownRoll[],
    version: 1,
  };
}

interface Value {
  actual: number,
  expected: number,
}

export function extractGameDetails(jsonObject: ParsedReplay): GameDetails {
  var firstStep = jsonObject.Replay.ReplayStep[0];
  var lastStep =
    jsonObject.Replay.ReplayStep[jsonObject.Replay.ReplayStep.length - 1];
  return {
    //fileName: lastStep.RulesEventGameFinished.MatchResult.Row.ReplayFilename,
    stadiumName: he.decode(firstStep.GameInfos.NameStadium.toString()),
    stadiumType: firstStep.GameInfos.StructStadium,
    leagueName: firstStep.GameInfos.RowLeague.Name && he.decode(firstStep.GameInfos.RowLeague.Name.toString()),
    homeTeam: {
      coachName: he.decode(firstStep.GameInfos.CoachesInfos.CoachInfos[SIDE.home].UserId.toString()),
      teamName: he.decode(firstStep.BoardState.ListTeams.TeamState[SIDE.home].Data.Name.toString()),
      raceId: firstStep.BoardState.ListTeams.TeamState[SIDE.home].Data.IdRace,
      score: lastStep.RulesEventGameFinished.MatchResult.Row.HomeScore || 0,
    },
    awayTeam: {
      coachName: he.decode(firstStep.GameInfos.CoachesInfos.CoachInfos[SIDE.away].UserId.toString()),
      teamName: he.decode(firstStep.BoardState.ListTeams.TeamState[SIDE.away].Data.Name.toString()),
      raceId: firstStep.BoardState.ListTeams.TeamState[SIDE.away].Data.IdRace,
      score: lastStep.RulesEventGameFinished.MatchResult.Row.AwayScore || 0,
    },
  };
}


