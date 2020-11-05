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
    rolls = rolls.filter((roll) => !roll.ignore);

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
