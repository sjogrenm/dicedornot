import { BinFuncDistribution, ComparativeDistribution, Distribution, SimpleDistribution, SingleValue } from "./distribution.js";
import { io } from "./io.js";
import { replay } from "./replay.js";
import vegaSpec from "./vega-spec.js";

var fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", function () {
  if (fileInput.files.length > 0) {
    $("#loading").show();
    $("#data-param-error").hide();
    $('#summary').hide();
    $('#results').hide();
    $('#explanation').hide();
    $('#details').hide();
    $('#details-list').empty();
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
  updateRollLog(replayData.rolls);

  updateGameDetails(replayData.gameDetails);

  $("#loading").hide();
  $('#summary').show();
  $('#results').show();
  $('#explanation').show();
  $('#details').show();

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
  var values = rolls
    .filter((roll) => {
      const dataPoint = roll.actual;
      if (!isFinite(dataPoint.outcomeValue)) {
        console.warn("Dice roll with non-finite outcome value", {
          roll: roll,
          dataPoint: dataPoint,
        });
        return false;
      }
      if (!isFinite(dataPoint.expectedValue)) {
        console.warn("Dice roll with non-finite expected value", {
          roll: roll,
          dataPoint: dataPoint,
        });
        return false;
      }
      return true;
    })
    .map((roll) => roll.actual);

  // Assign the specification to a local variable vlSpec.

  // Embed the visualization in the container with id `vis`
  vegaEmbed(
    '#chart',
    Object.assign(
      {
        data: {
          name: 'rolls',
          values: values
        }
      },
      vegaSpec
    )
  )
  .then((result) => {
    result.view.addEventListener('click', function (event, item) {
      $('#details').find(`.active`).removeClass('active');
      $(`#roll-${item.datum.rollIndex}`)
        .addClass('active')
        .parents('details')
        .attr({ open: true });
    });

    var iteration = 0;
    function addValues() {
      var values = [];
      var curIteration = Math.max(iteration, 1);
      for (var x = 0; x < 50; x++) {
        iteration++;
        values = values.concat(rolls.map((roll) => roll.simulated(iteration)));
      }
      var changeSet = vega.changeset().insert(values);
      result.view.change('rolls', changeSet).run();
      $('#game-count').text(iteration);
      console.log(iteration, values.length);
      if (iteration < 1000) {
        window.setTimeout(addValues, 200);
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
      return "Chaos Pact";
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

function updateRollLog(rolls) {
  console.log(rolls);
  const groupedRolls = rolls.reduce((groups, roll) => {
    const lastGroup = groups[groups.length - 1];
    const lastRoll = lastGroup && lastGroup[lastGroup.length - 1];
    if (
      !lastGroup ||
      !lastRoll ||
      lastRoll.activeTeam.id != roll.activeTeam.id ||
      lastRoll.turn != roll.turn
    ) {
      groups.push([roll]);
    } else {
      lastGroup.push(roll);
    }
    return groups;
  }, []);
  for (const group of groupedRolls) {
    const rollDetails = group.map(
      (roll) => `
        <li id="roll-${
          roll.rollIndex
        }" class="list-group-item list-group-item-action">
          ${renderRoll(roll)}
        </li>
      `
    );
    $('#details-list').append(
      $(
        `
        <li class="list-group-item">
          <details>
            <summary>${group[0].activeTeam.name} - Turn ${
          group[0].turn
        }</summary>
            <ul class="list-group">${rollDetails.join('\n')}</ul>
          </details>
        </li>`
      )
    );
  }

  function renderRoll(roll) {
    return `
      <details>
        <summary>${roll.jointDescription} ${roll.valueWithDependents.valueString} ${roll.possibleOutcomes.valueString}
        </summary>
        <ul class="list-group">
          <li class="list-group-item list-group-item-action">
            <details>
            <summary>Actual Outcomes</summary>
              <ul class="list-group">
                ${[roll, ...roll.dependentRolls].map(roll => {
                  const dist = roll.actualValue;
                  if (dist.name) {
                    return dist.named(`${roll.shortDescription} - ${dist.name}`);
                  } else {
                    return dist.named(roll.shortDescription);
                  }
                }).map(
                  dist => `<li class="list-group-item list-group-item-action">${renderDistribution(dist)}</li>`
                ).join('\n')}
              </ul>
            </details>
          </li>
          <li class="list-group-item list-group-item-action">
            ${renderDistribution(roll.possibleOutcomes.named('Possible Outcomes')) }
          </li>
        </ul>
      </details>
    `
  }

  function renderDistribution(dist) {
    if (dist instanceof SingleValue) {
      if (dist.value instanceof Distribution) {
        return renderDistribution(dist.value.named(dist.name));
      } else {
        return `${dist.name} ${dist.valueString}`;
      }
    } else if (dist instanceof SimpleDistribution) {
      const summary = dist.name ? `${dist.name} \u2192 ${dist.valueString}` : dist.valueString;
      const distDetails = dist.values.map(
        value => {
          if (value.value instanceof Distribution) {
            return `<li class="list-group-item list-group-item-action">${renderDistribution(value.value.named(`${(value.weight * 100).toFixed(1)}%: ${value.name}`))}</li>`
          } else {
            return `<li class="list-group-item list-group-item-action">${(value.weight * 100).toFixed(1)}%: ${value.name} \u2192 ${value.value}</li>`
          }
        }
      ).join('\n');
      return `
          <details>
            <summary>${summary}</summary>
            <ul class="list-group">${distDetails}</ul>
          </details>
        `
    } else if (dist instanceof ComparativeDistribution) {
      return renderDistribution(dist.simple);
    } else if (dist instanceof BinFuncDistribution) {
      const valueTerm = dist.values.reduce((name, value) => name ? dist.nameFunc(name, value.name || value) : value.name, null);
      const summary = dist.name ?
        `${dist.name} \u2192 ${valueTerm} ${dist.valueString}` :
        `${valueTerm} ${dist.valueString}`;
      const distDetails = dist.values.map(
        value => {
          if (value instanceof Distribution) {
            return `<li class="list-group-item list-group-item-action">${renderDistribution(value)}</li>`
          } else {
            return `<li class="list-group-item list-group-item-action">${value.toFixed(2)}</li>`
          }
        }
      ).join('\n');
      return `
          <details>
            <summary>${summary}</summary>
            <ul class="list-group">${distDetails}</ul>
          </details>
        `

    } else {
      return dist.toString();
    }
  }
}
