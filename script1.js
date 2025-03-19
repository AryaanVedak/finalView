let data = [];

function loadCSV() {
  d3.csv("Billionaires Statistics Dataset.csv")
    .then((csvData) => {

      // Process and clean CSV data
      const data = csvData
        .map((d) => ({
          gender: d.gender,
          personName: d["personName"],
          country: d["country"],
          latitude_country: +d["latitude_country"],
          longitude_country: +d["longitude_country"],
          finalWorth: +d["finalWorth"] || 0,
          gdp_country: +d["gdp_country"].replace(/[^0-9.]/g, "") || 0, // Extract only numbers
          selfMade: d["selfMade"].toLowerCase() === "true",
          age: +d["age"] || 0, // Add age field
          industry: d["industries"] || "Unknown", // Add industry field
        }))
        .filter((d) => d.gdp_country > 0); // Remove invalid GDP values

      // Compute total wealth and GDP per country (adding it inside data itself)
      const countryAggregates = new Map();

      data.forEach((d) => {
        if (!countryAggregates.has(d.country)) {
          countryAggregates.set(d.country, { totalWealth: 0, gdp: 0 });
        }

        countryAggregates.get(d.country).totalWealth += d.finalWorth;
        countryAggregates.get(d.country).gdp = Math.max(
          countryAggregates.get(d.country).gdp,
          d.gdp_country
        );
      });

      // Append aggregated values to each entry in `data`
      data.forEach((d) => {
        const countryData = countryAggregates.get(d.country);
        d.totalWealth = countryData.totalWealth / 1000; // Convert to billions
        d.gdp = countryData.gdp / 1e12 || 0.001; // Convert to trillions, ensure min value
      });

      // Get unique industries for the filter
      const industries = ["All", ...new Set(data.map(d => d.industry))].filter(Boolean).sort();

      const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Billionaire Distribution and Rankings",
        params: [
          {
            name: "age_filter",
            value: 20,
            bind: {
              input: "select",
              options: [20, 30, 40, 50, 60, 70, 80, 90, 100],
              name: "Minimum Age: "
            }
          },
          {
            name: "max_age_filter",
            value: 100,
            bind: {
              input: "select",
              options: [30, 40, 50, 60, 70, 80, 90, 100],
              name: "Maximum Age: "
            }
          },
          {
            name: "gender_filter",
            value: "All",
            bind: {
              input: "select",
              options: ["All", "M", "F"],
              name: "Gender: "
            }
          },
          {
            name: "industry_filter",
            value: "All",
            bind: {
              input: "select",
              options: industries,
              name: "Industry: "
            }
          }
        ],
        config: {
          view: {
            stroke: "transparent"
          }
        },
        padding: 10,
        autosize: {
          type: "fit",
          contains: "padding"
        },
        vconcat: [
          {
            hconcat: [
              {
                width: 450,
                height: 350,
                title: {
                  text: "How does wealth distribution vary by country?",
                  subtitle:
                    "World Billionaire Distribution (Click circles to select countries)",
                },
                layer: [
                  {
                    data: {
                      url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/world-110m.json",
                      format: { type: "topojson", feature: "countries" },
                    },
                    projection: { type: "equalEarth" },
                    mark: { type: "geoshape", fill: "#ddd", stroke: "white" },
                  },
                  {
                    data: { values: data },
                    transform: [
                      {
                        filter: "datum.age >= age_filter && datum.age <= max_age_filter"
                      },
                      {
                        filter: "gender_filter === 'All' || datum.gender === gender_filter"
                      },
                      {
                        filter: "industry_filter === 'All' || datum.industry === industry_filter"
                      }
                    ],
                    params: [
                      {
                        name: "map_select",
                        select: {
                          type: "point",
                          fields: ["country"],
                          toggle: true,
                          on: "click",
                          clear: "dblclick",
                        },
                      },
                      {
                        name: "map_brush",
                        select: {
                          type: "interval",
                          encodings: ["x", "y"]
                        }
                      }
                    ],
                    projection: { type: "equalEarth" },
                    mark: {
                      type: "circle",
                      cursor: "pointer",
                    },
                    encoding: {
                      longitude: {
                        field: "longitude_country",
                        type: "quantitative",
                      },
                      latitude: {
                        field: "latitude_country",
                        type: "quantitative",
                      },
                      size: {
                        field: "finalWorth",
                        type: "quantitative",
                        scale: { range: [50, 800] },
                        title: "Net Worth ($M)",
                      },
                      color: {
                        condition: {
                          param: "map_select",
                          value: "red"
                        },
                        condition: {
                          param: "map_brush",
                          value: "orange"
                        },
                        value: "steelblue"
                      },
                      tooltip: [
                        { field: "country", type: "nominal", title: "Country" },
                        { field: "personName", type: "nominal", title: "Name" },
                        {
                          field: "finalWorth",
                          type: "quantitative",
                          title: "Net Worth ($M)",
                        },
                        { field: "age", type: "quantitative", title: "Age" },
                        { field: "industry", type: "nominal", title: "Industry" }
                      ],
                    },
                  },
                ],
              },
              {
                width: 450,
                height: 350,
                title: {
                  text: " How does wealth correlate with country GDP?",
                  subtitle: "Total Billionaire Wealth vs GDP",
                },
                data: { values: data },
                transform: [
                  {
                    filter: "datum.age >= age_filter && datum.age <= max_age_filter"
                  },
                  {
                    filter: "gender_filter === 'All' || datum.gender === gender_filter"
                  },
                  {
                    filter: "industry_filter === 'All' || datum.industry === industry_filter"
                  },
                  {
                    filter: {
                      param: "map_select",
                    },
                  },
                  {
                    filter: {
                      param: "map_brush"
                    }
                  },
                  { filter: { param: "selfMade_select" } },
                ],
                params: [
                  {
                    name: "brush",
                    select: {
                      type: "interval",
                      encodings: ["x", "y"]
                    }
                  },
                  {
                    name: "scatter_select",
                    select: {
                      type: "point",
                      fields: ["country"],
                      toggle: true,
                      on: "click"
                    }
                  }
                ],
                mark: {
                  type: "circle",
                  size: 80,
                  cursor: "pointer",
                  opacity: 0.7,
                },
                encoding: {
                  x: {
                    field: "gdp",
                    type: "quantitative",
                    scale: { type: "log" },
                    title: "GDP (Trillions $)",
                    axis: { grid: true },
                  },
                  y: {
                    field: "totalWealth",
                    type: "quantitative",
                    scale: { type: "log" },
                    title: "Total Billionaire Wealth (Billions $)",
                    axis: { grid: true },
                  },
                  color: {
                    condition: {
                      param: "scatter_select",
                      value: "red"
                    },
                    value: "steelblue"
                  },
                  size: {
                    condition: {
                      param: "scatter_select",
                      value: 120
                    },
                    value: 80
                  },
                  tooltip: [
                    { field: "country", type: "nominal", title: "Country" },
                    {
                      field: "totalWealth",
                      type: "quantitative",
                      title: "Total Wealth ($B)",
                      format: ",.1f",
                    },
                    {
                      field: "gdp",
                      type: "quantitative",
                      title: "GDP ($T)",
                      format: ",.2f",
                    },
                  ],
                },
              },
            ],
          },
          {
            width: 900,
            height: 250,
            title: {
              text: "Top 10 Billionaires in Selected Countries",
              subtitle: "Double-click to clear selection",
            },
            data: { values: data },
            transform: [
              {
                filter: "datum.age >= age_filter && datum.age <= max_age_filter"
              },
              {
                filter: "gender_filter === 'All' || datum.gender === gender_filter"
              },
              {
                filter: "industry_filter === 'All' || datum.industry === industry_filter"
              },
              {
                filter: {
                  param: "map_select",
                },
              },
              {
                filter: {
                  param: "map_brush"
                }
              },
              {
                filter: {
                  param: "brush"
                }
              },
              {
                filter: {
                  param: "scatter_select"
                }
              },
              { filter: { param: "selfMade_select" } },
              {
                window: [{ op: "rank", as: "rank" }],
                sort: [{ field: "finalWorth", order: "descending" }],
              },
              { filter: "datum.rank <= 10" },
            ],
            params: [
              {
                name: "bar_brush",
                select: {
                  type: "interval",
                  encodings: ["x"]
                }
              },
              {
                name: "bar_select",
                select: {
                  type: "point",
                  fields: ["personName"],
                  toggle: true,
                  on: "click"
                }
              }
            ],
            mark: {
              type: "bar",
              cursor: "pointer",
            },
            encode: {
              update: {
                opacity: [
                  {
                    test: "length(data('map_select_store')) > 0 || length(data('map_brush_store')) > 0 || length(data('scatter_select_store')) > 0 || length(data('brush_store')) > 0",
                    value: 1,
                  },
                  {
                    value: 0,
                  },
                ],
              },
            },
            encoding: {
              y: {
                field: "personName",
                type: "nominal",
                sort: "-x",
                title: null,
              },
              x: {
                field: "finalWorth",
                type: "quantitative",
                title: "Net Worth (Millions USD)",
              },
              color: {
                condition: {
                  param: "bar_select",
                  value: "red"
                },
                condition: {
                  param: "bar_brush",
                  value: "orange"
                },
                value: "steelblue"
              },
              tooltip: [
                { field: "personName", type: "nominal", title: "Name" },
                { field: "country", type: "nominal", title: "Country" },
                {
                  field: "finalWorth",
                  type: "quantitative",
                  title: "Net Worth ($M)",
                },
                { field: "rank", type: "ordinal", title: "Rank" },
                { field: "age", type: "quantitative", title: "Age" },
                { field: "industry", type: "nominal", title: "Industry" }
              ],
            },
          },
          {
            width: 350,
            height: 350,
            title: {
              text: "Self-Made vs Inherited Billionaires",
              subtitle: "In selected countries",
            },
            data: { values: data },
            transform: [
              {
                filter: "datum.age >= age_filter && datum.age <= max_age_filter"
              },
              {
                filter: "gender_filter === 'All' || datum.gender === gender_filter"
              },
              {
                filter: "industry_filter === 'All' || datum.industry === industry_filter"
              },
              {
                filter: {
                  param: "map_select",
                },
              },
              {
                filter: {
                  param: "map_brush"
                }
              },
              {
                filter: {
                  param: "brush"
                }
              },
              {
                filter: {
                  param: "scatter_select"
                }
              },
              {
                filter: {
                  param: "bar_brush"
                }
              },
              {
                filter: {
                  param: "bar_select"
                }
              },
              {
                aggregate: [
                  { op: "count", as: "count" },
                  { op: "sum", field: "finalWorth", as: "totalWealth" },
                ],
                groupby: ["selfMade"],
              },
              {
                calculate: "datum.selfMade ? 'Self-Made' : 'Inherited'",
                as: "selfMadeLabel",
              },
              { filter: { param: "selfMade_select" } },
            ],
            params: [
              {
                name: "selfMade_select",
                select: { type: "point", fields: ["selfMade"] },
              },
            ],
            mark: {
              type: "arc",
              innerRadius: 50,
              tooltip: true,
            },
            encode: {
              update: {
                opacity: [
                  {
                    test: "length(data('map_select_store')) > 0 || length(data('map_brush_store')) > 0 || length(data('scatter_select_store')) > 0 || length(data('brush_store')) > 0 || length(data('bar_brush_store')) > 0 || length(data('bar_select_store')) > 0",
                    value: 1,
                  },
                  {
                    value: 0,
                  },
                ],
              },
            },
            encoding: {
              theta: {
                field: "count",
                type: "quantitative",
                stack: true,
              },
              color: {
                field: "selfMade",
                type: "nominal",
                scale: {
                  domain: [true, false],
                  range: ["#1f77b4", "#ff7f0e"],
                },
                title: "Self-Made",
              },
              tooltip: [
                { field: "selfMadeLabel", type: "nominal", title: "Type" },
                { field: "count", type: "quantitative", title: "Count" },
                {
                  field: "totalWealth",
                  type: "quantitative",
                  title: "Total Wealth ($B)",
                  format: ",.1f",
                },
              ],
            },
          },
        ],
      };

      vegaEmbed("#vis", spec, { actions: false }).catch(console.error);
    })
    .catch((error) => console.error("Error loading CSV:", error));
}

loadCSV();