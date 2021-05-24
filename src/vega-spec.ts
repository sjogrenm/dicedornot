export const valueSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container',
  height: 'container',
  config: {
    range: {
      category: ['#db0000', '#5252ff'],
    }
  },
  title: "Net Value vs Net Expected Value",
  layer: [
    {  // Play Head Marker
      data: { name: 'playHead' },
      mark: { type: 'rule' },
      encoding: {
        x: {
          type: 'quantitative',
          field: 'actionIndex',
          title: 'Action',
          axis: {
            labelExpr: 'floor(datum.label)'
          }
        },
      }
    },
    {
      data: { name: 'actual' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          window: [
            { op: 'sum', field: 'netValue', as: 'cumNetValue' },
            { op: 'sum', field: 'outcomeValue', as: 'cumValue' },
            { op: 'sum', field: 'expectedValue', as: 'cumExpValue' }
          ],
          groupby: ['activeTeamId', 'iteration', 'type']
        },
        {
          calculate: "'#roll-' + datum.actionIndex",
          as: 'url'
        },
      ],
      layer: [

        {  // Actual value trend
          mark: {
            type: 'area', interpolate: 'monotone', line: true, point: true,
            opacity: 0.3,
          },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'actionIndex',
              title: 'Action',
              axis: {
                labelExpr: 'floor(datum.label)'
              }
            },
            y: {
              field: 'cumValue',
              type: 'quantitative',
            },
            y2: {
              field: 'cumExpValue',
              type: 'quantitative',
            },
            color: {
              field: 'activeTeamColor',
              type: 'nominal',
              title: 'Active Team',
            },
            detail: {
              field: 'iteration',
              type: 'nominal'
            },
            tooltip: [
              { field: 'turn', title: 'Turn' },
              { field: 'activeTeamName', title: 'Active Team' },
              { field: 'description', title: 'Roll' },
              { field: 'valueDescription', title: 'Value' },
              { field: 'netValue', title: 'Net Value', format: '.2f' },
              {
                field: 'cumValue',
                title: 'Cumulative Value',
                format: '.2f'
              },
              {
                field: 'cumExpValue',
                title: 'Cumulative Expected Value',
                format: '.2f'
              },
              {
                field: 'cumNetValue',
                title: 'Cumulative Net Value',
                format: '.2f'
              },
            ],
          }
        },
        {  // Actual value trend
          mark: { type: 'line', interpolate: 'monotone', strokeDash: [6, 4] },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'actionIndex',
              title: 'Action',
              axis: {
                labelExpr: 'floor(datum.label)'
              }
            },
            y: {
              field: 'cumExpValue',
              type: 'quantitative',
              title: 'Value'
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
      ]
    }
  ]
};

export const expectedValueSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container',
  height: 'container',
  config: {
    range: {
      category: ['#db0000', '#5252ff'],
    }
  },
  title: "Net Expected Value",
  layer: [
    {  // Play Head Marker
      data: { name: 'playHead' },
      mark: { type: 'rule' },
      encoding: {
        x: {
          type: 'quantitative',
          field: 'actionIndex',
          title: 'Action',
          axis: {
            labelExpr: 'floor(datum.label)'
          }
        },
      }
    },
    {
      data: { name: 'actual' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          window: [
            { op: 'sum', field: 'expectedValue', as: 'cumExpValue' }
          ],
          groupby: ['activeTeamId', 'iteration', 'type']
        },
        {
          calculate: "'#roll-' + datum.actionIndex",
          as: 'url'
        },
      ],
      layer: [
        {  // Actual value trend
          mark: { type: 'line', interpolate: 'monotone', point: true },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'actionIndex',
              title: 'Action',
              axis: {
                labelExpr: 'floor(datum.label)'
              }
            },
            y: {
              field: 'cumExpValue',
              type: 'quantitative',
              title: 'Value'
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
            },
            tooltip: [
              { field: 'turn', title: 'Turn' },
              { field: 'activeTeamName', title: 'Active Team' },
              { field: 'description', title: 'Roll' },
              {
                field: 'expectedValue',
                title: 'Expected Value',
                format: '.2f'
              },
              {
                field: 'cumExpValue',
                title: 'Cumulative EV',
                format: '.2f'
              },
            ],
          }
        },
      ]
    }
  ]
  // }
};

export const valueDistributionSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container',
  height: 'container',
  config: {
    range: {
      category: ['#db0000', '#5252ff'],
    }
  },
  title: "Outcome Value Distribution",
  layer: [
    {  // Play Head Marker
      data: { name: 'playHead' },
      mark: { type: 'rule' },
      encoding: {
        x: {
          type: 'quantitative',
          field: 'actionIndex',
          title: 'Action',
          axis: {
            labelExpr: 'floor(datum.label)'
          }
        },
      }
    },
    {
      data: { name: 'actual' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          calculate: "'#roll-' + datum.actionIndex",
          as: 'url'
        },
      ],
      layer: [
        {  // Distribution
          transform: [
            {
              flatten: ['outcomes', 'weights'],
            },
            {
              bin: { step: 0.1, anchor: -0.05 },
              field: 'outcomes',
              as: ['outcomes_min', 'outcomes_max']
            },
            {
              aggregate: [{ op: 'sum', field: 'weights', as: 'weight_sum' }],
              groupby: [
                'actionIndex',
                'activeTeamColor',
                'activeTeamName',
                'outcomes_min',
                'outcomes_max',
                'cumNetValue',
                'netValue',
                'description',
              ],
            },
            {
              calculate: 'datum.actionIndex',
              as: 'x'
            },
            {
              calculate: 'datum.actionIndex + clamp(datum.weight_sum, 0.2, 1) * .9',
              as: 'x2'
            },
            {
              calculate: 'datum.outcomes_min',
              as: 'y'
            },
            {
              calculate: 'datum.outcomes_max',
              as: 'y2'
            },
            {
              calculate: "join([format(datum.outcomes_min, '.2f'), format(datum.outcomes_max, '.2f')], ' - ')",
              as: 'outcomes_range'
            }
          ],
          mark: {
            type: "rect",
          },
          encoding: {
            x: {
              type: 'quantitative',
              field: 'x'
            },
            x2: {
              type: 'quantitative',
              field: 'x2'
            },
            y: {
              type: 'quantitative',
              field: 'y',
              // scale: { type: "log" },
            },
            y2: {
              type: 'quantitative',
              field: 'y2',
              // scale: { type: "log" },
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
              { field: 'description', title: 'Roll' },
              { field: 'outcomes_range', title: 'Net Value Change' },
              { field: 'weight_sum', title: 'Probability', format: '.2p' },
              { field: 'activeTeamName', title: 'Active Team' }
            ]
          }
        },
      ]
    }
  ]
};

export const improbabilitySpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  width: 'container',
  height: 'container',
  config: {
    range: {
      category: ['#db0000', '#5252ff'],
    }
  },
  title: "Net Improbability",
  layer: [
    {  // Play Head Marker
      data: { name: 'playHead' },
      mark: { type: 'rule' },
      encoding: {
        x: {
          type: 'quantitative',
          field: 'actionIndex',
          title: 'Action',
          axis: {
            labelExpr: 'floor(datum.label)'
          }
        },
      }
    },
    {
      data: { name: 'actual' },
      transform: [
        {
          calculate: "join([datum.activeTeamId, datum.activeTeamName], '. ')",
          as: 'activeTeamColor'
        },
        {
          window: [
            { op: 'sum', field: 'improbability', as: 'cumImprobability' },
          ],
          groupby: ['activeTeamId', 'iteration', 'type']
        },
        {
          calculate: "'#roll-' + datum.actionIndex",
          as: 'url'
        },
      ],
      mark: { type: 'line', interpolate: 'monotone', point: { opacity: 0.5 } },
      encoding: {
        x: {
          type: 'quantitative',
          field: 'actionIndex',
          title: 'Action',
          axis: {
            labelExpr: 'floor(datum.label)'
          },
          scale: {
            rangeMin: 0
          }
        },
        y: {
          field: 'cumImprobability',
          type: 'quantitative',
          title: 'Cumulative Improbability'
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
        },
        tooltip: [
          { field: 'turn', title: 'Turn' },
          { field: 'activeTeamName', title: 'Active Team' },
          { field: 'description', title: 'Roll' },
          { field: 'improbability', title: 'Improbability', format: '.2f' },
          {
            field: 'cumImprobability',
            title: 'Cumulative Improbability',
            format: '.2f'
          },
        ],
      }
    }
  ]
  // }
};
