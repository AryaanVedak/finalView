let data = [];

function cleanGDP(value) {
  return Number(value.replace(/\$|,/g, "")); // Remove $ and , then convert to number
}

function loadCSV() {
  d3.csv("Billionaires Statistics Dataset.csv")
    .then((csvData) => {
      const data = csvData.map((d) => ({
        personName: d["personName"],
        gender: d.gender,
        country: d["country"],
        latitude_country: +d["latitude_country"],
        longitude_country: +d["longitude_country"],
        age: +d["age"],
        industries: d["industries"].trim(),
        finalWorth: +d["finalWorth"] || 0,
        gdp_country:
          cleanGDP(d.gdp_country) && !isNaN(cleanGDP(d.gdp_country))
            ? +cleanGDP(d.gdp_country) / 1e12 // Convert GDP to Trillions
            : null,
        selfMade: d["selfMade"].toLowerCase() === "true",
      }));

      // Compute country-level total wealth and billionaire count
      const countryStats = new Map();
      data.forEach((b) => {
        if (!countryStats.has(b.country)) { 
          countryStats.set(b.country, { totalWealth: 0, numBillionaires: 0 });
        }
        const stats = countryStats.get(b.country);
        stats.totalWealth += b.finalWorth;
        stats.numBillionaires += 1;
      });

      // Merge aggregated data back into individual billionaire entries
      const mergedData = data.map((b) => ({
        ...b,
        totalWealth: countryStats.get(b.country).totalWealth,
        numBillionaires: countryStats.get(b.country).numBillionaires,
      }));

      // Filter out invalid data
      const cleanedData = mergedData.filter(
        (d) =>
          d.gdp_country > 0 &&
          d.totalWealth > 0 &&
          !isNaN(d.gdp_country) &&
          !isNaN(d.totalWealth)
      );

      const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Billionaire Distribution and Rankings",
        background: "#ffffff",
        config: {
          title: {
            fontSize: 20,
            font: "Helvetica",
            fontWeight: "bold",
            color: "#333",
            subtitleFontSize: 14,
            subtitleColor: "#666",
            subtitleFont: "Helvetica",
            anchor: "start",
            offset: 15
          },
          axis: {
            labelFont: "Helvetica",
            titleFont: "Helvetica",
            titleFontWeight: "bold",
            titleColor: "#333",
            labelColor: "#555",
            gridColor: "#eaeaea"
          },
          legend: {
            titleFont: "Helvetica",
            labelFont: "Helvetica",
            titleFontWeight: "bold",
            padding: 10,
            cornerRadius: 4
          },
          view: {
            stroke: "transparent",
            strokeWidth: 0
          }
        },
        vconcat: [
          {
            width: 1400,
            height: 600,
            title: {
              text: "Number of Billionaires by Country",
              subtitle: "Click bars to select countries",
            },
            data: { values: cleanedData },
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
                name: "gender_select",
                select: { type: "point", fields: ["gender"] },
                bind: {
                  input: "select",
                  options: [null, "M", "F"],
                  labels: ["All", "Male", "Female"],
                  name: "Gender: "
                }
              }
            ],
            transform: [
              { filter: { param: "gender_select" } }
            ],
            mark: {
              type: "bar",
              cornerRadius: 4,
              tooltip: true,
              opacity: 0.9
            },
            encoding: {
              x: {
                field: "country",
                type: "nominal",
                title: "Country",
                sort: "-y",
                axis: {
                  labelAngle: -45,
                  labelLimit: 150
                }
              },
              y: {
                aggregate: "count",
                title: "Number of Billionaires",
                axis: {
                  grid: true,
                  tickMinStep: 1
                }
              },
              color: {
                condition: {
                  param: "map_select",
                  value: "#3182bd"
                },
                value: "#e0e0e0"
              },
              tooltip: [
                { field: "country", type: "nominal", title: "Country" },
                { aggregate: "count", title: "Number of Billionaires" }
              ]
            }
          },
          {
            height: 700,
            data: { values: cleanedData },
            title: {
              text: "How does wealth correlate with country GDP?",
              subtitle: "Comparison of GDP and Billionaire Wealth",
            },
            hconcat: [
              {
                mark: {
                  type: "bar",
                  cornerRadius: 4,
                  tooltip: true,
                  opacity: 0.9
                },
                width: 800,
                height: 400,
                transform: [
                  {
                    filter: {
                      param: "map_select",
                    },
                  },
                  { filter: { param: "selfMade_select" } },
                  { filter: { param: "gender_select" } },
                ],
                encoding: {
                  x: {
                    field: "country",
                    type: "nominal",
                    title: "Country",
                    band: {
                      condition: {
                        param: "map_select",
                        empty: false,
                        value: 0.8,
                      },
                    },
                    axis: {
                      labelAngle: -45,
                      labelLimit: 120
                    }
                  },
                  y: {
                    field: "gdp_country",
                    type: "quantitative",
                    title: "GDP of Country (USD Trillions)",
                    axis: {
                      grid: true,
                      format: ",.1f"
                    }
                  },
                  color: { 
                    value: "#4292c6"
                  },
                  tooltip: [
                    { field: "country", type: "nominal", title: "Country" },
                    {
                      field: "gdp_country",
                      type: "quantitative",
                      title: "GDP ($T)",
                      format: ",.2f",
                    },
                  ],
                }
              },
              {
                mark: {
                  type: "bar",
                  cornerRadius: 4,
                  tooltip: true,
                  opacity: 0.9
                },
                data: { values: cleanedData },
                width: 800,
                height: 400,
                transform: [
                  {
                    filter: {
                      param: "map_select",
                    },
                  },
                  { filter: { param: "gender_select" } },
                ],
                encoding: {
                  x: {
                    field: "country",
                    type: "nominal",
                    title: "Country",
                    band: {
                      condition: {
                        param: "map_select",
                        empty: false,
                        value: 0.8,
                      },
                    },
                    axis: {
                      labelAngle: -45,
                      labelLimit: 120
                    }
                  },
                  y: {
                    field: "totalWealth",
                    type: "quantitative",
                    title: "Billionaire Wealth (USD Billions)",
                    axis: {
                      grid: true,
                      format: ",.0f"
                    }
                  },
                  color: { 
                    value: "#e6550d"
                  },
                  tooltip: [
                    { field: "country", type: "nominal", title: "Country" },
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
          },
          {
            width: 1400,
            height: 550,
            title: {
              text: "Top 10 Billionaires in Selected Countries",
              subtitle: "Double-click to clear selection",
            },
            data: { values: cleanedData },
            transform: [
              {
                filter: {
                  param: "map_select",
                },
              },
              { filter: { param: "selfMade_select" } },
              { filter: { param: "gender_select" } },
              {
                window: [{ op: "rank", as: "rank" }],
                sort: [{ field: "finalWorth", order: "descending" }],
              },
              { filter: { param: "country_select" } },
            ],
            mark: {
              type: "circle",
              cursor: "pointer",
              color: "#3182bd",
              opacity: 0.8,
              size: 100,
              stroke: "white",
              strokeWidth: 1
            },
            encode: {
              update: {
                opacity: [
                  {
                    test: "length(data('map_select_store')) > 0",
                    value: 0.8,
                  },
                  {
                    value: 0,
                  },
                ],
              },
            },
            encoding: {
              x: {
                field: "age",
                type: "quantitative",
                title: "Age",
                axis: {
                  grid: true,
                  tickMinStep: 5
                }
              },
              y: {
                field: "finalWorth",
                type: "quantitative",
                title: "Net Worth (Millions USD)",
                scale: { type: "log" },
                axis: {
                  grid: true,
                  format: ",.0f"
                }
              },
              size: {
                field: "finalWorth",
                type: "quantitative",
                scale: {
                  range: [50, 500]
                },
                legend: null
              },
              tooltip: [
                { field: "personName", type: "nominal", title: "Name" },
                { field: "country", type: "nominal", title: "Country" },
                {
                  field: "finalWorth",
                  type: "quantitative",
                  title: "Net Worth ($M)",
                  format: ",.0f"
                },
                { field: "rank", type: "ordinal", title: "Rank" },
                { field: "age", type: "quantitative", title: "Age" }
              ],
            },
          },
          {
            width: 1200,
            height: 400,
            data: { values: data },
            title: {
              text: "Self-Made vs Inherited Billionaires",
              subtitle: "In selected countries",
            },
            transform: [
              { filter: { param: "map_select" } },
              { filter: { param: "gender_select" } },
              {
                aggregate: [{ op: "count", as: "count" }],
                groupby: ["country", "selfMade"],
              },
              {
                calculate: "datum.selfMade ? 'Self-Made' : 'Inherited'",
                as: "selfMadeLabel",
              },
              { filter: { param: "selfMade_select" } },
              { filter: { param: "country_select" } },
            ],
            params: [
              {
                name: "selfMade_select",
                select: { type: "point", fields: ["selfMade"] },
              },
              {
                name: "country_select",
                select: { type: "point", fields: ["country"] },
              },
            ],
            mark: {
              type: "bar",
              cornerRadius: 4,
              tooltip: true,
              opacity: 0.9
            },
            encoding: {
              x: { 
                field: "country", 
                type: "nominal", 
                title: "Country",
                axis: {
                  labelAngle: -45,
                  labelLimit: 120
                }
              },
              y: {
                field: "count",
                type: "quantitative",
                stack: "normalize",
                title: "Proportion of Billionaires",
                axis: {
                  format: ".0%",
                  grid: true
                }
              },
              color: {
                field: "selfMadeLabel",
                type: "nominal",
                scale: {
                  domain: ["Self-Made", "Inherited"],
                  range: ["#3182bd", "#fd8d3c"],
                },
                title: "Type",
                legend: {
                  orient: "top",
                  symbolType: "circle"
                }
              },
              tooltip: [
                { field: "country", type: "nominal", title: "Country" },
                { field: "selfMadeLabel", type: "nominal", title: "Type" },
                { field: "count", type: "quantitative", title: "Count" },
                { 
                  calculate: "datum.count / datum.count * 100", 
                  type: "quantitative", 
                  title: "Percentage",
                  format: ".1f"
                }
              ],
            },
          },
          {
            width: 1200,
            height: 550,
            data: { values: data },
            title: {
              text: "Billionaires by Industry and Gender",
              subtitle: "Distribution across industries by gender",
            },
            transform: [
              { filter: { param: "map_select" } },
              { filter: { param: "gender_select" } },
              {
                aggregate: [
                  { op: "count", as: "count" }
                ],
                groupby: ["industries", "gender"],
              },
              { filter: { param: "industry_select" } },
              { filter: { param: "country_select" } },
            ],
            params: [
              {
                name: "industry_select",
                select: { type: "point", fields: ["industries"] },
              },
              {
                name: "country_select",
                select: { type: "point", fields: ["country"] },
              },
            ],
            mark: {
              type: "bar",
              cornerRadius: 4,
              tooltip: true,
              opacity: 0.9
            },
            encoding: {
              x: { 
                field: "industries", 
                type: "nominal", 
                title: "Industry",
                axis: {
                  labelAngle: -45,
                  labelLimit: 120
                }
              },
              y: {
                field: "count",
                type: "quantitative",
                title: "Number of Billionaires",
                axis: {
                  grid: true
                }
              },
              color: {
                field: "gender",
                type: "nominal",
                title: "Gender",
                scale: {
                  domain: ["M", "F"],
                  range: ["#3182bd", "#de2d26"],
                },
                legend: { 
                  symbolType: "circle",
                  orient: "top"
                }
              },
              tooltip: [
                { field: "industries", type: "nominal", title: "Industry" },
                { field: "gender", type: "nominal", title: "Gender" },
                { field: "count", type: "quantitative", title: "Count" }
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
