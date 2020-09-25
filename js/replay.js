import { Roll } from "./rolls.js";

export const replay = {
  processReplay: function (data) {
    //console.log("replay.processReplay");
    //console.log(data);

    var gameDetails = extractGameDetails(data);
    console.log("Extracted game details...", gameDetails);

    var playerDetails = {};
    var rolls = [];
    for (
      var stepIndex = 0;
      stepIndex < data.replay.replaystep.length;
      stepIndex++
    ) {
      var replayStep = data.replay.replaystep[stepIndex];
      // extractPlayerDetails(replayStep, playerDetails);
      // extractActionsFromStep(replayStep, rolls);
      rolls = rolls.concat(Roll.fromReplayStep(stepIndex, replayStep));
    }
    console.log("Extracted rolls...", rolls);

    return {
      gameDetails: gameDetails,
      playerDetails: playerDetails,
      rolls: rolls,
      version: 1,
    };
  },
};

function extractGameDetails(jsonObject) {
  var firstStep = jsonObject.replay.replaystep[0];
  var lastStep =
        jsonObject.replay.replaystep[jsonObject.replay.replaystep.length - 1];
  console.log("Full gameinfo:");
  console.log(firstStep.gameinfos);
  return {
    //fileName: lastStep.ruleseventgamefinished.matchresult.row.replayfilename,
    stadiumName: firstStep.gameinfos.namestadium,
    stadiumType: firstStep.gameinfos.structstadium,
    leagueName: firstStep.gameinfos.rowleague.name,
    homeTeam: {
      coachName: firstStep.gameinfos.coachesinfos.coachinfos[0].userid,
      teamName: firstStep.boardstate.listteams.teamstate[0].data.name,
      raceId: firstStep.boardstate.listteams.teamstate[0].data.idrace,
      score: lastStep.ruleseventgamefinished.matchresult.row.homescore || 0,
    },
    awayTeam: {
      coachName: firstStep.gameinfos.coachesinfos.coachinfos[1].userid,
      teamName: firstStep.boardstate.listteams.teamstate[1].data.name,
      raceId: firstStep.boardstate.listteams.teamstate[1].data.idrace,
      score: lastStep.ruleseventgamefinished.matchresult.row.awayscore || 0,
    },
  };
}

function translateStringNumberList(str) {
  if (!str) return [];

  var stripped = str.substring(1, str.length - 1);
  var textList = stripped.split(",");

  var numberList = [];
  for (var i = 0; i < textList.length; i++) {
    numberList.push(parseInt(textList[i]));
  }
  return numberList;
}

function extractPlayerDetails(replayStep, playerDetails) {
  var teamStates = (((replayStep || {}).boardstate || {}).listteams || {})
    .teamstate;
  if (!teamStates || teamStates.length < 2) return;

  extractPlayerDetailsFromTeamState(teamStates[0], playerDetails);
  extractPlayerDetailsFromTeamState(teamStates[1], playerDetails);
}

function extractPlayerDetailsFromTeamState(teamState, playerDetails) {
  var players = ((teamState || {}).listpitchplayers || {}).playerstate;
  if (!players) return;

  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    if (!(player.id in playerDetails)) {
      playerDetails[player.id] = {
        id: player.id,
        teamId: player.data.teamid || 0,
        type: player.data.idplayertypes,
        name: player.data.name,
        // player.data.name is sometimes useful but not populated for hired players
      };
    }
  }
}

function extractActionsFromStep(replayStep, actionsList) {
  var kickoffDetails = extractKickoffDetails(replayStep);
  if (kickoffDetails) {
    actionsList.push(kickoffDetails);
  }

  var actions = replayStep.ruleseventboardaction;
  if (actions && actions.length) {
    for (var actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      var action = actions[actionIndex];
      processAction(replayStep, action, actionsList);
    }
  } else if (actions) {
    processAction(replayStep, actions, actionsList);
  }
}

function processAction(replayStep, action, actionsList) {
  if (!action) return;

  var results = action.results.boardactionresult;
  if (results && results.length) {
    for (var resultIndex = 0; resultIndex < results.length; resultIndex++) {
      var result = results[resultIndex];
      processResult(replayStep, action, result, actionsList);
    }
  } else {
    processResult(replayStep, action, results, actionsList);
  }
}

function processResult(replayStep, action, result, actionsList) {
  if (!result) return;

  if (result.coachchoices && result.coachchoices.listdices) {
    var actionDetails = extractActionDetails(replayStep, action, result);

    if (actionDetails) {
      actionsList.push(actionDetails);
    }
  }
}

function extractActionDetails(replayStep, action, result) {
  var dice = translateDice(result.coachchoices.listdices, result.rolltype);

  // Translate kickoff scatters to their own type
  if (result.rolltype == 10 && dice.length > 1) {
    result.rolltype = -2;
  }

  return {
    team: replayStep.boardstate.activeteam || 0,
    turn:
      replayStep.boardstate.listteams.teamstate[
        replayStep.boardstate.activeteam || 0
      ].gameturn || 0,
    player: action.playerid,
    rollType: result.rolltype,
    dice: dice,
    outcomeValue: outcomeValue(
      result.rolltype,
      dice,
      action.playerid,
      action.targetid
    ),
    expectedValue: expectedValue(
      result.rolltype,
      dice,
      action.playerid,
      action.targetid
    ),
  };
}

function expectedValue(rollType, rollResult, player, target) {
  if (rollType == ROLL_BLOCK) {
    if (rollResult.length == 1) {
      values = BLOCK.values.map(blockResultValue);
    } else {
      values = TWO_DIE_BLOCK.values.map((dice) =>
        Math.max(blockResultValue(dice[0]), blockResultValue(dice[1]))
      );
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  return 0;
}

function outcomeValue(rollType, rollResult, player, target) {
  if (rollType == ROLL_BLOCK) {
    if (rollResult.length == 1) {
      return blockResultValue(asBlockDie(rollResult));
    } else {
      return Math.max(...rollResult.map(asBlockDie).map(blockResultValue));
    }
  }
  return 0;
}

function translateDice(dice, rollType) {
  var diceList = translateStringNumberList(dice);

  // For some reason block dice have an extra set of dice at the end
  if (rollType == 5) {
    diceList = diceList.slice(0, diceList.length / 2);
  }
  // Casualty dice are also doubled up, and also both rolls appear when an apoc is used (so the last one is the valid one)
  else if (rollType == 8) {
    diceList = diceList.slice(0, diceList.length / 2);
    diceList = [diceList[diceList.length - 1]];
  }

  return diceList;
}

function extractKickoffDetails(replayStep) {
  if (!replayStep.ruleseventkickofftable) return null;

  return {
    team: replayStep.boardstate.activeteam || 0,
    turn:
      replayStep.boardstate.listteams.teamstate[
        replayStep.boardstate.activeteam || 0
      ].gameturn || 0,
    player: null,
    rollType: -1,
    dice: translateDice(replayStep.ruleseventkickofftable.listdice, -1),
  };
}
