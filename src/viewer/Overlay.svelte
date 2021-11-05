<script lang="ts">
  import { ACTION_TYPE, ROLL } from "../constants.js";
  import { linearReplay } from "../replay-utils.js";
  import { ensureKeyedList, translateStringNumberList } from "../replay/BB2.js";
  import { replayPreview, replay } from "../stores.js";
  import type { Cell } from "../replay/Internal.js";
  import { convertCell, playerNumberToSide } from "../replay/BB2toInternal.js";
  import OverlayMove from "./OverlayMove.svelte";
  import type { Props as OverlayMoveProps } from "./OverlayMove.svelte";
  import OverlayBlock from "./OverlayBlock.svelte";
  import type { Props as OverlayBlockProps } from "./OverlayBlock.svelte";
  import chroma from "chroma-js";
  import type { Colors } from "./types.js";
  import type { DeepReadonly } from "ts-essentials";
  import type * as Internal from "../replay/Internal.js";

  import { awayTeamColor, awayTeamGray, homeTeamColor, homeTeamGray } from "../theme.js";
  import type {
    BlitzResults,
    BlockResults,
    KeyedMList,
  } from "../replay/BB2.js";

  let paths: OverlayProps[];

  type OverlayProps =
    | {
        type: "move";
        team: Internal.Side;
        props: OverlayMoveProps;
      }
    | {
        type: "block";
        team: Internal.Side;
        props: OverlayBlockProps;
      };

  function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
      throw new Error(msg);
    }
  }

  function cellEqual(a: Cell, b: Cell): boolean {
    return a.x == b.x && a.y == b.y;
  }

  function colors(team: Internal.Side, index: number, maxIndex: number): Colors {
    let colorScale, textScale, oppColorScale, oppTextScale;
    if (team == 'home') {
      colorScale = homeTeamColor;
      textScale = homeTeamGray;
      oppColorScale = awayTeamColor;
      oppTextScale = awayTeamColor;
    } else {
      colorScale = awayTeamColor;
      textScale = awayTeamGray;
      oppColorScale = homeTeamColor;
      oppTextScale = homeTeamColor;
    }
    let color = colorScale((maxIndex - index) / maxIndex);
    let lightText = textScale(0).brighten();
    let darkText = textScale(1).darken();
    let textColor;
    if (chroma.contrast(color, lightText) > chroma.contrast(color, darkText)) {
      textColor = lightText;
    } else {
      textColor = darkText;
    }
    let oppColor = oppColorScale((maxIndex - index) / maxIndex);
    let oppLightText = oppTextScale(0).brighten();
    let oppDarkText = oppTextScale(1).darken();
    if (
      chroma.contrast(oppColor, oppLightText) >
      chroma.contrast(color, oppDarkText)
    ) {
      textColor = oppLightText;
    } else {
      textColor = oppDarkText;
    }
    return { color, textColor, oppColor };
  }

  $: {
    paths = [];
    for (const position of linearReplay($replay!.fullReplay!).slice(
      $replayPreview!.start,
      $replayPreview!.end
    )) {
      if ("subStep" in position && "action" in position) {
        let action = position.action;
        if (position.resultIdx > 0) {
          continue;
        }
        if (!("ActionType" in action) && "Order" in action) {
          let from = convertCell(action.Order.CellFrom);
          let to = convertCell(action.Order.CellTo.Cell);
          let rolls = ensureKeyedList("BoardActionResult", action.Results)
            .filter((result) => "Requirement" in result)
            .map((result) => {
              assert("Requirement" in result);
              let requirement = result.Requirement || 0;
              let modifier =
                ensureKeyedList("DiceModifier", result.ListModifiers)
                  .map((modifier) => modifier.Value || 0)
                  .reduce((a, b) => a + b, 0) || 0;
              return `${requirement - modifier}+`;
            })
            .join(" ");
          let team = playerNumberToSide(action.PlayerId || 0);
          let lastPath = paths[paths.length - 1];
          if (lastPath && lastPath.type === "move") {
            let lastCell = lastPath.props.path[lastPath.props.path.length - 1];
            if (cellEqual(lastCell, from)) {
              lastPath.props.path.push(to);
              if (rolls) {
                lastPath.props.rolls.push({ from, to, rolls });
              }
              continue;
            }
          }
          paths.push({
            type: "move",
            props: {
              path: [from, to],
              rolls: rolls ? [{ from, to, rolls }] : [],
            },
            team,
          });
        } else if ("ActionType" in action) {
          switch (action.ActionType) {
            case ACTION_TYPE.Blitz:
            case ACTION_TYPE.Block: {
              let results: DeepReadonly<(BlockResults | BlitzResults)[]> =
                ensureKeyedList(
                  "BoardActionResult",
                  action.Results as KeyedMList<
                    "BoardActionResult",
                    BlockResults | BlitzResults
                  >
                );
              for (const result of results) {
                let last: OverlayProps = paths[paths.length - 1];
                if (
                  "RollType" in result &&
                  result.RollType == ROLL.Block &&
                  result.IsOrderCompleted != 1
                ) {
                  let from = convertCell(action.Order.CellFrom);
                  let to = convertCell(action.Order.CellTo.Cell);
                  let team = playerNumberToSide(action.PlayerId || 0);
                  let modifier =
                    ensureKeyedList("DiceModifier", result.ListModifiers)
                      .map((modifier) => modifier.Value || 0)
                      .reduce((a, b) => a + b, 0) || 0;
                  let requirement = result.Requirement || 0 - modifier;
                  let dieCount =
                    translateStringNumberList(result.CoachChoices.ListDices)
                      .length / 2;
                  let roll = "";
                  if (requirement < 0) {
                    if (dieCount == 2) {
                      roll = "\u00BDD";
                    } else if (dieCount == 3) {
                      roll = "\u2153D";
                    }
                  } else {
                    roll = `${dieCount}D`;
                  }
                  if (
                    last &&
                    last.type === "block" &&
                    last.props.from.x == from.x &&
                    last.props.from.y == from.y &&
                    last.props.to.x == to.x &&
                    last.props.to.y == to.y
                  ) {
                    last.props.rolls += ` ${roll}`;
                  } else {
                    paths.push({
                      type: "block",
                      props: { from, to, rolls: roll, follow: false },
                      team,
                    });
                  }
                } else if (
                  last &&
                  "RollType" in result &&
                  result.RollType == ROLL.Push &&
                  result.IsOrderCompleted == 1 &&
                  last.type === "block"
                ) {
                  let pushOptions = ensureKeyedList(
                    "Cell",
                    result.CoachChoices.ListCells
                  );
                  if (pushOptions) {
                    last.props.pushTo = convertCell(pushOptions[0]);
                  }
                } else if (
                  last &&
                  "RollType" in result &&
                  result.RollType == ROLL.FollowUp &&
                  result.IsOrderCompleted == 1 &&
                  last.type === "block"
                ) {
                  let followOptions = ensureKeyedList(
                    "Cell",
                    result.CoachChoices.ListCells
                  );
                  if (followOptions) {
                    let followTo = convertCell(followOptions[0]);
                    last.props.follow =
                      followTo.x != last.props.from.x ||
                      followTo.y != last.props.from.y;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="-0.5 -0.5 26 15"
  class="overlay svelte-7djegz"
>
  <defs>
    <filter
      id="chalk"
      height="2"
      width="1.6"
      color-interpolation-filters="sRGB"
      y="-0.5"
      x="-0.3"
    >
      <feTurbulence
        baseFrequency="50"
        seed="115"
        result="result1"
        numOctaves="1"
        type="turbulence"
      />
      <feOffset result="result2" dx="-1" dy="-1" />
      <feDisplacementMap
        scale="0.1"
        yChannelSelector="G"
        in2="result1"
        xChannelSelector="R"
        in="SourceGraphic"
      />
      <feGaussianBlur stdDeviation="0.005" />
    </filter>
  </defs>
  {#each paths as path, index}
    {#if path.type == "block"}
      <OverlayBlock
        {...path.props}
        colors={colors(path.team, index, paths.length)}
        index={index + 1}
      />
    {:else if path.type == "move"}
      <OverlayMove
        {...path.props}
        colors={colors(path.team, index, paths.length)}
        index={index + 1}
      />
    {/if}
  {/each}
</svg>
