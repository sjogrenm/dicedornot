const vegaSpec = {
  $schema: "https://vega.github.io/schema/vega-lite/v4.json",
  width: 1200,
  height: 800,
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
      groupby: ["activeTeamId", "iteration", "type"],
    },
  ],
  layer: [
    {
      transform: [
        {
          aggregate: [
            { op: "min", field: "cumNetValue", as: "teamMinNetValue" },
            { op: "max", field: "cumNetValue", as: "teamMaxNetValue" },
          ],
          groupby: ["rollIndex", "turn", "activeTeamColor", "activeTeamName"],
        },
        {
          joinaggregate: [
            { op: "min", field: "teamMinNetValue", as: "minNetValue" },
            { op: "max", field: "teamMaxNetValue", as: "maxNetValue" },
          ],
        },
        {
          calculate: "datum.rollIndex - 0.5",
          as: "x",
        },
        {
          calculate: "datum.rollIndex + 0.5",
          as: "x2",
        },
      ],
      mark: {
        type: "rect",
        opacity: 0.05,
      },
      encoding: {
        x: { field: "x", type: "quantitative" },
        x2: { field: "x2", type: "quantitative" },
        y: { field: "minNetValue", type: "quantitative", title: "Net Value" },
        y2: {
          field: "maxNetValue",
          type: "quantitative",
          title: "Net Value",
        },
        color: { field: "activeTeamColor", type: "nominal" },
        tooltip: [
          { field: "turn", title: "Turn" },
          { field: "activeTeamName", title: "Active Team" },
        ],
      },
    },
    {
      transform: [
        {
          quantile: "cumNetValue",
          probs: [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99],
          groupby: ["activeTeamColor", "rollIndex"],
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
          field: "rollIndex",
          title: "Turn",
          axis: {
            labelExpr: "floor(datum.label)",
          },
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
          field: "rollIndex",
          title: "Turn",
          axis: {
            labelExpr: "floor(datum.label)",
          },
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
          field: "rollIndex",
          title: "Turn",
          axis: {
            labelExpr: "floor(datum.label)",
          },
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
          { field: "turn", title: "Turn" },
          { field: "activeTeamName", title: "Active Team" },
          { field: "description", title: "Roll" },
          { field: "valueDescription", title: "Value" },
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

export default vegaSpec;
