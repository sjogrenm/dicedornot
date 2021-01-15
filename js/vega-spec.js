import { valueArray } from "vega-lite/build/src/channeldef";

const breakPoints = [-0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5]

const vegaSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container',
  height: 500,
  layer: [
    {
      data: { name: 'simulated' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          window: [{ op: 'sum', field: 'netValue', as: 'cumNetValue' }],
          groupby: ['activeTeamId', 'iteration', 'type']
        }
      ],
      layer: [
        {
          transform: [
            {
              aggregate: [
                { op: 'min', field: 'cumNetValue', as: 'teamMinNetValue' },
                { op: 'max', field: 'cumNetValue', as: 'teamMaxNetValue' }
              ],
              groupby: ['rollIndex', 'turn', 'activeTeamColor', 'activeTeamName']
            },
            {
              joinaggregate: [
                { op: 'min', field: 'teamMinNetValue', as: 'minNetValue' },
                { op: 'max', field: 'teamMaxNetValue', as: 'maxNetValue' }
              ]
            },
            {
              calculate: 'datum.rollIndex - 0.5',
              as: 'x'
            },
            {
              calculate: 'datum.rollIndex + 0.5',
              as: 'x2'
            }
          ],
          mark: {
            type: 'rect',
            opacity: 0.05
          },
          encoding: {
            x: { field: 'x', type: 'quantitative' },
            x2: { field: 'x2', type: 'quantitative' },
            y: { field: 'minNetValue', type: 'quantitative', title: 'Net Value' },
            y2: {
              field: 'maxNetValue',
              type: 'quantitative',
              title: 'Net Value'
            },
            color: {
              field: 'activeTeamColor', type: 'nominal',
              legend: {
                disable: true
              },
            },
            tooltip: [
              { field: 'turn', title: 'Turn' },
              { field: 'activeTeamName', title: 'Active Team' }
            ]
          }
        },
        {
          transform: [
            {
              quantile: 'cumNetValue',
              probs: [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99],
              groupby: ['activeTeamColor', 'rollIndex']
            },
            {
              calculate: 'datum.prob * 100',
              as: 'perc'
            }
          ],
          mark: {
            type: 'line',
            opacity: 0.3,
            interpolate: 'basis'
          },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'rollIndex',
              title: 'Action',
              axis: {
                labelExpr: 'floor(datum.label)'
              }
            },
            y: {
              field: 'value',
              type: 'quantitative',
              title: 'Net Value'
            },
            color: {
              field: 'activeTeamColor',
              type: 'nominal',
              title: 'Team',
              legend: {
                disable: true
              },
            },
            detail: {
              field: 'prob',
              type: 'nominal'
            },
            tooltip: [
              { field: 'activeTeamColor', title: 'Active Team' },
              { field: 'value', title: 'Cumulative Net Value', format: '.2f' },
              { field: 'perc', title: 'Percentile', format: '.0f' }
            ]
          }
        }
      ]
    },
    {
      data: { name: 'actual' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          window: [{ op: 'sum', field: 'netValue', as: 'cumNetValue' }],
          groupby: ['activeTeamId', 'iteration', 'type']
        },
        {
          calculate: "'#roll-' + datum.rollIndex",
          as: 'url'
        },
      ],
      layer: [
        {
          mark: { type: 'line', interpolate: 'monotone' },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'rollIndex',
              title: 'Action',
              axis: {
                labelExpr: 'floor(datum.label)'
              }
            },
            y: {
              field: 'cumNetValue',
              type: 'quantitative',
              title: 'Net Value'
            },
            color: {
              field: 'activeTeamColor',
              type: 'nominal',
              title: 'Active Team',
              legend: {
                disable: true
              },
            },
            detail: {
              field: 'iteration',
              type: 'nominal'
            }
          }
        },
        {
          transform: [
            {
              flatten: ['outcomes', 'weights'],
            },
            {
              bin: { step: 0.5, anchor: -0.25 },
              field: 'outcomes',
              as: ['outcomes_min', 'outcomes_max']
            },
            {
              aggregate: [{ op: 'sum', field: 'weights', as: 'weight_sum' }],
              groupby: [
                'rollIndex',
                'activeTeamColor',
                'activeTeamName',
                'outcomes_min',
                'outcomes_max',
                'cumNetValue',
                'netValue',
              ],
            },
            {
              calculate: 'datum.outcomes_min + datum.cumNetValue - datum.netValue',
              as: 'posNetValue_min'
            },
            {
              calculate: 'datum.outcomes_max + datum.cumNetValue - datum.netValue',
              as: 'posNetValue_max'
            },
            {
              calculate: 'datum.rollIndex - (datum.weight_sum / 2)',
              as: 'x'
            },
            {
              calculate: 'datum.rollIndex + (datum.weight_sum / 2)',
              as: 'x2'
            },
            {
              calculate: 'datum.posNetValue_min',
              as: 'y'
            },
            {
              calculate: 'datum.posNetValue_max',
              as: 'y2'
            },
            {
              calculate: "join([datum.outcomes_min, datum.outcomes_max], ' - ')",
              as: 'outcomes_range'
            }
          ],
          mark: {
            type: "rect",
            opacity: 0.7,
          },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'x',
            },
            x2: {
              type: 'quantitative',
              field: 'x2',
            },
            y: {
              type: 'quantitative',
              field: 'y',
            },
            y2: {
              type: 'quantitative',
              field: 'y2',
            },
            color: {
              field: 'activeTeamColor',
              type: 'nominal',
              title: 'Team',
              legend: {
                disable: true,
              },
            },
            tooltip: [
              { field: 'outcomes_range', title: 'Net Value Change' },
              { field: 'weight_sum', title: 'Probability', format: '.2p' },
              { field: 'activeTeamName', title: 'Active Team' }
            ]
          }
        },
        {
          mark: { type: 'point' },
          selection: {
            zoom_x: { type: "interval", bind: "scales", encodings: ["x"] },
          },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'rollIndex'
            },
            y: {
              field: 'cumNetValue',
              type: 'quantitative',
              title: 'Net Value'
            },
            color: {
              field: 'activeTeamColor',
              type: 'nominal',
              title: 'Team',
              legend: {
                disable: true,
              },
            },
            tooltip: [
              { field: 'turn', title: 'Turn' },
              { field: 'activeTeamName', title: 'Active Team' },
              { field: 'description', title: 'Roll' },
              { field: 'valueDescription', title: 'Value' },
              { field: 'netValue', title: 'Net Value', format: '.2f' },
              {
                field: 'cumNetValue',
                title: 'Cumulative Net Value',
                format: '.2f'
              },
            ],
            href: { field: 'url', type: 'nominal' }
          }
        }
      ]
    }
  ]
  // }
};

export default vegaSpec;
