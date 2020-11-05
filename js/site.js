
import { io } from "./io.js";
import { replay } from "./replay.js";

var fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", function () {
  if (fileInput.files.length > 0) {
    $("#loading").show();
    $("#data-param-error").hide();
    $("#summary-div").hide();
    $("#results-div").hide();
    $("#explanation-div").hide();
    console.log("Preparing to parse XML...");

    io.xmlToJson(
      fileInput.files[0],
      function (jsonObj) {
        console.log("Preparing to process replay json...");
        var replayData = replay.processReplay(jsonObj);

        // var jsoncCompressedJson = JSONC.compress(replayData);
        // var jsoncCompressedString = JSON.stringify(jsoncCompressedJson);
        // var lzstringCompressed = LZString.compressToEncodedURIComponent(
        // jsoncCompressedString
        // );
        console.log("Preparing to render replay data...");
        renderReplayData(replayData, "");
      },
      function (err) {
        $("#loading").hide();
        alert(err);
      }
    );
  }
});

function renderReplayData(replayData, dataParam) {
  //var baseUrl = "http://localhost:8080";
  var baseUrl = "http://dicedornot.vengefulpickle.com";
  var resultsPage = "/index.html";
  var resultsUrl = baseUrl + resultsPage + "?data=" + dataParam;
  var encodedResultsUrl = encodeURIComponent(resultsUrl);
  var tinyUrlCreator =
    "http://tinyurl.com/create.php?url=" + encodedResultsUrl + "#success";

  console.log("Rendering replay data...");
  updateChart(replayData.rolls);

  updateGameDetails(replayData.gameDetails);

  $("#loading").hide();
  $("#summary-div").show();
  $("#results-div").show();
  $("#explanation-div").show();

  $("#share-massive-url").attr("href", resultsUrl);
  $("#share-tiny-url").attr("href", tinyUrlCreator);
  $("#share-alert").show();

  //console.log("Deleting other stats " + $(".other-stats").length);
  $(".other-stats").remove();

  // drawCharts(gameStats, replayData.gameDetails);

  document.getElementById("results-with-padding").scrollIntoView();
}

function updateChart(rolls) {
  console.log(rolls);
  var values = rolls.map((roll) => roll.actual);
  // Assign the specification to a local variable vlSpec.
  // TODO: put details of the action into the popup
  var vlSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v4.json",
    width: 1200,
    height: 800,
    data: {
      name: "rolls",
      values: values,
    },
    transform: [
      {
        calculate: "join([datum.teamId, datum.teamName], '. ')",
        as: "teamColor",
      },
      {
        calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
        as: "activeTeamColor",
      },
      { calculate: "datum.outcomeValue - datum.expectedValue", as: "netValue" },
      {
        window: [{ op: "sum", field: "netValue", as: "cumNetValue" }],
        groupby: ["activeTeamId", "iteration"],
      },
      {
        window: [
          {op: "percent_rank", as: "turnRank"}
        ],
        groupby: ["turn"],
        sort: [
            {field: "stepIndex", order: "ascending"},
            {field: "actionIndex", order: "ascending"},
            {field: "resultIndex", order: "ascending"}
        ],
        frame: [null, null],
      },
      {
        calculate: "datum.turn + datum.turnRank",
        as: "gameFraction",
      },
    ],
    layer: [
      {
        transform: [
          {
            aggregate: [
              {op: "min", field: "gameFraction", as: "teamTurnStart"},
              {op: "max", field: "gameFraction", as: "teamTurnEnd"},
              {op: "min", field: "cumNetValue", as: "teamMinNetValue"},
              {op: "max", field: "cumNetValue", as: "teamMaxNetValue"},
            ],
            groupby: ['turn', 'activeTeamColor', 'activeTeamName'],
          },
          {
            joinaggregate: [
              {op: "min", field: "teamMinNetValue", as: "minNetValue"},
              {op: "max", field: "teamMaxNetValue", as: "maxNetValue"},
            ],
          },
        ],
        mark: {
          type: "rect",
          opacity: 0.05,
        },
        encoding: {
          x: {field: "teamTurnStart", type: "quantitative"},
          x2: {field: "teamTurnEnd", type: "quantitative"},
          y: {field: "minNetValue", type: "quantitative", title: "Net Value"},
          y2: {field: "maxNetValue", type: "quantitative", title: "Net Value"},
          color: {field: "activeTeamColor", type: "nominal"},
          tooltip: [
            { field: "turn", title: "Turn" },
            { field: "activeTeamName", title: "Active Team" }
          ],
        }
      },
      {
        transform: [
          {
            quantile: "cumNetValue",
            probs: [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99],
            groupby: ["activeTeamColor", "gameFraction"],
          },
          {
            calculate: "datum.prob * 100",
            as: "perc",
          },
        ],
        mark: {
          type: "line",
          opacity: 0.3,
          interpolate: "basis",
        },
        encoding: {
          x: {
            type: "quantitative",
            field: "gameFraction",
            title: "Turn",
            axis: {
              labelExpr: "floor(datum.label)"
            }
          },
          y: {
            field: "value",
            type: "quantitative",
            title: "Net Value",
          },
          color: {
            field: "activeTeamColor",
            type: "nominal",
            title: "Team",
          },
          detail: {
            field: "prob",
            type: "nominal",
          },
          tooltip: [
            { field: "activeTeamColor", title: "Active Team" },
            { field: "value", title: "Cumulative Net Value", format: ".2f" },
            { field: "perc", title: "Percentile", format: ".0f" },
          ],
        },
      },
      {
        transform: [
          {
            filter: "datum.type == 'actual'",
          },
        ],
        mark: { type: "line", interpolate: "monotone" },
        encoding: {
          x: {
            type: "quantitative",
            field: "gameFraction",
            title: "Turn",
            axis: {
              labelExpr: "floor(datum.label)"
            }
          },
          y: {
            field: "cumNetValue",
            type: "quantitative",
            title: "Net Value",
          },
          color: {
            field: "activeTeamColor",
            type: "nominal",
            title: "Active Team",
          },
          detail: {
            field: "iteration",
            type: "nominal",
          },
        },
      },
      {
        transform: [
          {
            filter: "datum.type == 'actual'",
          },
        ],
        mark: { type: "point" },
        encoding: {
          x: {
            type: "quantitative",
            field: "gameFraction",
            title: "Turn",
            axis: {
              labelExpr: "floor(datum.label)"
            }
          },
          y: {
            field: "cumNetValue",
            type: "quantitative",
            title: "Net Value",
          },
          color: {
            field: "teamColor",
            type: "nominal",
            title: "Team",
          },
          tooltip: [
            { field: "turn", title: "Turn"},
            { field: "activeTeamName", title: "Active Team"},
            { field: "teamName", title: "Player Team" },
            { field: "player", title: "Player" },
            { field: "playerSkills", title: "Player Skill" },
            { field: "rollName", title: "Roll Type" },
            { field: "dice", title: "Actual Roll" },
            { field: "target", title: "Target" },
            { field: "outcomeValue", title: "Value", format: ".2f" },
            { field: "expectedValue", title: "Expected Value", format: ".2f" },
            { field: "netValue", title: "Net Value", format: ".2f" },
            {
              field: "cumNetValue",
              title: "Cumulative Net Value",
              format: ".2f",
            },
          ],
        },
      },
    ],
    // }
  };

  // Embed the visualization in the container with id `vis`
  vegaEmbed("#chart", vlSpec).then((res) => {
    var iteration = 0;
    function addValues() {
      var values = [];
      var curIteration = Math.max(iteration, 1);
      for (var x = 0; x < curIteration; x++) {
        iteration++;
        values = values.concat(rolls.map((roll) => roll.simulated(iteration)));
      }
      var changeSet = vega.changeset().insert(values);
      res.view.change("rolls", changeSet).run();
      $("#game-count").text(iteration);
      console.log(iteration, values.length);
      if (iteration <= 64) {
        window.setTimeout(addValues, 100);
      }
    }
    addValues();
  });
}

function raceIdToName(raceId) {
  switch (raceId) {
    case 1:
      return "Human";
    case 2:
      return "Dwarf";
    case 3:
      return "Skaven";
    case 4:
      return "Orc";
    case 5:
      return "Lizardman";
    case 6:
      return "Goblin";
    case 7:
      return "Wood Elf";
    case 8:
      return "Chaos";
    case 9:
      return "Dark Elf";
    case 10:
      return "Undead";
    case 12:
      return "Norse";
    case 14:
      return "Pro Elf";
    case 15:
      return "High Elf";
    case 16:
      return "Khemri";
    case 17:
      return "Necromantic";
    case 18:
      return "Nurgle";
    case 20:
      return "Vampire";
    case 21:
      return "Chaos Dwarf";
    case 22:
      return "Underworld";
    case 24:
      return "Bretonnian";
    case 25:
      return "Kislev";
    case 33:
      return "Chaos Pa";
    case 35:
    default:
      return raceId;
  }
}

function updateGameDetails(gameDetails) {
  $("#file-name").text(gameDetails.fileName);

  $("#home-coach").text(gameDetails.homeTeam.coachName);
  $("#home-team").text(gameDetails.homeTeam.teamName);
  $("#home-race").text(raceIdToName(gameDetails.homeTeam.raceId));
  $("#home-score").text(gameDetails.homeTeam.score);

  $("#away-coach").text(gameDetails.awayTeam.coachName);
  $("#away-team").text(gameDetails.awayTeam.teamName);
  $("#away-race").text(raceIdToName(gameDetails.awayTeam.raceId));
  $("#away-score").text(gameDetails.awayTeam.score);

  $("#stadium-name").text(gameDetails.stadiumName);
  $("#stadium-type").text(gameDetails.stadiumType);
  $("#league-name").text(gameDetails.leagueName);
}
