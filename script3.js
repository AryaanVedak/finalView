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
        params: [
          {
            name: "gender_filter",
            bind: {
              input: "select",
              options: [null, "M", "F"],
              labels: ["All", "Male", "Female"],
              name: "Gender Filter: "
            },
            value: null
          },
          {
            name: "country_filter",
            bind: {
              input: "select",
              options: [null, ...new Set(cleanedData.map(d => d.country))],
              labels: ["All", ...new Set(cleanedData.map(d => d.country))],
              name: "Country Filter: "
            },
            value: null
          },
          {
            name: "gdp_filter",
            bind: {
              input: "range",
              min: 0,
              max: Math.max(...cleanedData.map(d => d.gdp_country)),
              step: 0.01,
              name: "GDP Filter: "
            },
            value: 0
          },
          {
            name: "wealth_filter",
            bind: {
              input: "range",
              min: 0,
              max: Math.max(...cleanedData.map(d => d.totalWealth)),
              step: 1,
              name: "Total Wealth Filter: "
            },
            value: 0
          }
        ],
        vconcat: [
          {
            width: 800,
            height: 400,

            title: {
              text: "Top 10 Billionaire Wealth Distribution",
              subtitle: "Double-click to clear selection",
            },
            data: { values: cleanedData },
            transform: [
              {
                filter: "!gender_filter || datum.gender == gender_filter"
              },
              {
                filter: "!country_filter || datum.country == country_filter"
              },
              {
                filter: "datum.gdp_country >= gdp_filter"
              },
              {
                filter: "datum.totalWealth >= wealth_filter"
              },
              { filter: { param: "selfMade_select" } },
              { filter: { param: "age_brush" } },
              { filter: { param: "country_select" } },
              { window: [{ op: "rank", as: "rank" }] },
              { filter: "datum.rank <= 10" }
            ],
            mark: {
              type: "bar",
              cursor: "pointer",
              color: "darkgreen",
            },
            encode: {
              update: {
                opacity: [
                  {
                    test: "length(data('map_select_store')) > 0",
                    value: 1,
                  },
                  {
                    value: 0,
                  },
                ],
              },
            },
            encoding: {
              x: {
                field: "personName",
                type: "nominal",
                title: "Billionaires",
                sort: "-y",
                axis: {
                  labelAngle: -45,
                  labelLimit: 150
                }
              },
              y: {
                field: "finalWorth",
                type: "quantitative",
                title: "Total Wealth (Millions USD)",
                aggregate: "sum"
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
                { field: "gender", type: "nominal", title: "Gender" },
                { field: "age", type: "quantitative", title: "Age" }
              ],
            },
          },
          {
            width: 800,
            height: 400,
            title: {
              text: "Billionaire Net Worth by Age Groups",
              subtitle: "Net worth distribution across 10-year age bins",
            },
            data: { values: cleanedData },
            transform: [
              {
                filter: "!gender_filter || datum.gender == gender_filter"
              },
              {
                filter: "!country_filter || datum.country == country_filter"
              },
              {
                filter: "datum.gdp_country >= gdp_filter"
              },
              {
                filter: "datum.totalWealth >= wealth_filter"
              }
            ],
            params: [
              {
                name: "age_brush",
                select: {
                  type: "interval",
                  encodings: ["x"],
                },
              },
              {
                name: "age_select",
                select: {
                  type: "point",
                  fields: ["age"],
                },
              },
            ],
            transform: [
              { filter: "!gender_filter || datum.gender == gender_filter" },
              { filter: "!country_filter || datum.country == country_filter" },
              { filter: "datum.gdp_country >= gdp_filter" },
              { filter: "datum.totalWealth >= wealth_filter" },
              // { filter: { param: "map_select" } },
              { filter: { param: "selfMade_select" } },
              { filter: { param: "country_select" } },
              { filter: { param: "age_select" } },
            ],
            mark: "bar",
            encoding: {
              x: {
                field: "age",
                type: "quantitative",
                title: "Age (Binned in 10-year intervals)",
                // bin: { step: 10 },
              },
              y: {
                field: "finalWorth",
                type: "quantitative",
                title: "Total Net Worth (Millions USD)",
                aggregate: "sum",
              },
              color: {
                condition: {
                  param: "age_brush",
                  field: "age",
                  type: "quantitative",
                  title: "Age Group",
                  // bin: { step: 10 },
                },
                value: "lightcoral",
              },
              tooltip: [
                { field: "age", type: "quantitative", title: "Age Group" },
                {
                  field: "finalWorth",
                  type: "quantitative",
                  aggregate: "sum",
                  title: "Total Net Worth ($M)",
                },
              ],
            },
          },
          {
            width: 800,
            height: 300,
            data: { values: cleanedData },
            transform: [
              {
                filter: "!gender_filter || datum.gender == gender_filter"
              },
              {
                filter: "!country_filter || datum.country == country_filter"
              },
              {
                filter: "datum.gdp_country >= gdp_filter"
              },
              {
                filter: "datum.totalWealth >= wealth_filter"
              }
            ],
            title: {
              text: "Self-Made vs Inherited Billionaires",
              subtitle: "In selected countries",
            },
            transform: [
              { filter: "!gender_filter || datum.gender == gender_filter" },
              { filter: "!country_filter || datum.country == country_filter" },
              { filter: "datum.gdp_country >= gdp_filter" },
              { filter: "datum.totalWealth >= wealth_filter" },
              // { filter: { param: "map_select" } },
              { filter: { param: "age_brush" } },
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
              { filter: { param: "age_select" } },
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
            mark: "bar",
            encoding: {
              x: {
                field: "country",
                type: "nominal",
                title: "Country",
                axis: { labelAngle: -45 },
              },
              xOffset: {
                field: "selfMadeLabel",
              },
              y: {
                field: "count",
                type: "quantitative",
                title: "Number of Billionaires",
              },
              color: {
                field: "selfMadeLabel",
                type: "nominal",
                scale: {
                  domain: ["Self-Made", "Inherited"],
                  range: ["#2ca02c", "#d62728"],
                },
                title: "Type",
              },
              tooltip: [
                { field: "selfMadeLabel", type: "nominal" },
                { field: "count", type: "quantitative" },
                { field: "country", type: "nominal", title: "Country" }
              ],
            },
          },
          {
            width: 800,
            height: 300,
            data: { values: cleanedData },
            transform: [
              {
                filter: "!gender_filter || datum.gender == gender_filter"
              },
              {
                filter: "!country_filter || datum.country == country_filter"
              },
              {
                filter: "datum.gdp_country >= gdp_filter"
              },
              {
                filter: "datum.totalWealth >= wealth_filter"
              }
            ],
            title: {
              text: "GDP Contribution by Industry",
              subtitle: "In selected countries",
            },
            transform: [
              { filter: "!gender_filter || datum.gender == gender_filter" },
              { filter: "!country_filter || datum.country == country_filter" },
              { filter: "datum.gdp_country >= gdp_filter" },
              { filter: "datum.totalWealth >= wealth_filter" },
              // { filter: { param: "map_select" } },
              { filter: { param: "age_brush" } },
              {
                // Instead of aggregating GDP directly, we need to count billionaires by industry
                aggregate: [
                  { op: "count", as: "billionaireCount" },
                  { op: "mean", field: "gdp_country", as: "avgGDP" }, // Use mean GDP as a proxy
                ],
                groupby: ["country", "industries"],
              },
              { filter: { param: "industry_select" } },
              { filter: { param: "country_select" } },
              { filter: { param: "age_select" } },
            ],
            params: [
              {
                name: "industry_select",
                select: { type: "point", fields: ["industries"] }, // Industry selection
              },
              {
                name: "country_select",
                select: { type: "point", fields: ["country"] }, // Country selection
              },
            ],
            mark: "bar",
            encoding: {
              x: { field: "country", type: "nominal", title: "Country" },
              y: {
                // Use the billionaire count or avgGDP instead of totalGDP
                field: "billionaireCount", // or "avgGDP"
                type: "quantitative",
                // stack: "normalize",
                title: "Number of Billionaires",
              },
              color: {
                field: "industries",
                type: "nominal",
                scale: {
                  domain: [
                    "Automotive",
                    "Construction & Engineering",
                    "Diversified",
                    "Energy",
                    "Fashion & Retail",
                    "Finance & Investments",
                    "Food & Beverage",
                    "Gambling & Casinos",
                    "Healthcare",
                    "Logistics",
                    "Manufacturing",
                    "Media & Entertainment",
                    "Metals & Mining",
                    "Real Estate",
                    "Service",
                    "Sports",
                    "Technology",
                    "Telecom",
                  ],
                  range: [
                    "#e41a1c",
                    "#377eb8",
                    "#4daf4a",
                    "#984ea3",
                    "#ff7f00",
                    "#ffff33",
                    "#a65628",
                    "#f781bf",
                    "#999999",
                    "#66c2a5",
                    "#fc8d62",
                    "#8da0cb",
                    "#e78ac3",
                    "#a6d854",
                    "#ffd92f",
                    "#e5c494",
                    "#b3b3b3",
                    "#1f78b4",
                  ],
                },
                legend: { title: "Industry", symbolType: "circle" },
              },

              tooltip: [
                { field: "country", type: "nominal" },
                { field: "industries", type: "nominal" },
                { field: "billionaireCount", type: "quantitative" },
                { field: "avgGDP", type: "quantitative", format: ",.2f" },
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
