import { BinFuncDistribution, ComparativeDistribution, Distribution, SimpleDistribution, SingleValue } from "./distribution.js";
import { io } from "./io.js";
import { replay } from "./replay.js";
import vegaSpec from "./vega-spec.js";


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
