import { Roll, MoveAction, UnknownRoll } from "./rolls.js";
import { END } from "./replay-utils.js";
import { SIDE } from "./constants.js";
import he from 'he';

export function processReplay(data) {
  //console.log("replay.processReplay");
  //console.log(data);

  var gameDetails = extractGameDetails(data);
  console.log("Extracted game details...", gameDetails);

  var playerDetails = {};
  var rolls = [];
  for (
    var stepIndex = 0;
    stepIndex < data.Replay.ReplayStep.length;
    stepIndex++
  ) {
    var replayStep = data.Replay.ReplayStep[stepIndex];
    replayStep.index = stepIndex;
    // extractPlayerDetails(replayStep, playerDetails);
    // extractActionsFromStep(replayStep, rolls);
    rolls = rolls.concat(Roll.fromReplayStep(
      data.Replay,
      data.Replay.ReplayStep[stepIndex - 1] && data.Replay.ReplayStep[stepIndex - 1].BoardState,
      stepIndex,
      replayStep
    ));
  }
  console.log("Extracted rolls...", { rolls });
  var validRolls = rolls.filter((roll) => !roll.ignore);
  validRolls = validRolls.reduce((rolls, nextRoll) => {
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
      nextRoll.dependentOn = lastRoll;
      nextRoll.dependentIndex = lastRoll.dependentRolls.length - 1;
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
  let activationValues = validRolls.reduce((acc, roll) => {
    if (roll.activePlayer) {
      acc[`${roll.turn}-${roll.activePlayer.name}`] = {
        actual: roll.valueWithDependents.valueOf(),
        expected: roll.onPitchValue(roll.activePlayer).valueOf(),
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
    playerDetails: playerDetails,
    rolls: validRolls,
    unknownRolls: rolls.filter(roll => roll instanceof UnknownRoll),
    version: 1,
  };
}

export function extractGameDetails(jsonObject) {
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
