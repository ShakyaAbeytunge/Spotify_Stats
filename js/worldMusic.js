const ctx = {
  WIDTH: 1000,
  HEIGHT: 700,
  mapMode: false,
  startDate: new Date(2017, 0, 1), // Jan 1, 2017
  endDate: new Date(2021, 11, 31), // Dec 31, 2021
  startDateC: new Date(2017, 0, 1),
  endDateC: new Date(2021, 11, 31),
  validCountries: [
    "Global",
    "Argentina",
    "Australia",
    "Austria",
    "Belgium",
    "Bolivia",
    "Brazil",
    "Bulgaria",
    "Canada",
    "Chile",
    "Colombia",
    "Costa Rica",
    "Czech Republic",
    "Denmark",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Guatemala",
    "Honduras",
    "Hong Kong",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Ireland",
    "Israel",
    "Italy",
    "Japan",
    "Latvia",
    "Lithuania",
    "Luxembourg",
    "Malaysia",
    "Mexico",
    "Morocco",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Norway",
    "Panama",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Romania",
    "Russia",
    "Saudi Arabia",
    "Singapore",
    "Slovakia",
    "South Africa",
    "South Korea",
    "Spain",
    "Sweden",
    "Switzerland",
    "Taiwan",
    "Thailand",
    "Turkey",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Vietnam",
  ],
};
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
let selectedYear = 2017; // Default starting year
let selectedFeature = "acousticness"; // Default feature
let lastStartDate = ctx.startDateC;
let lastEndDate = ctx.endDateC;
let countryCorrelationData = {}; // To store country correlation values for all features
let songData = {};

const txtFilePath = "data/listFile.txt";
const World_PROJ = d3
  .geoNaturalEarth1()
  .scale(200)
  .translate([ctx.WIDTH / 2, ctx.HEIGHT / 2]);

const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 100]);

// Draw the map
function drawMap(svgEl, geoJsonData) {
  const geoPathGen = d3.geoPath().projection(World_PROJ);

  svgEl
    .append("g")
    .attr("id", "world_map")
    .selectAll("path")
    .data(geoJsonData) // Bind GeoJSON features
    .enter()
    .append("path")
    .attr("d", geoPathGen)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("fill", "black") // Default color for all countries
    .attr("data-country", (d) => d.properties.name)
    .on("click", (event, d) => {
      const country = d.properties.name;
      if (ctx.validCountries.includes(country)) {
        window.location.href = `chart_analysis.html?country=${encodeURIComponent(
          country
        )}`;
      } else {
        alert(`${country} is not available in the dataset.`);
      }
    })
    .append("title")
    .text((d) => d.properties.name);
}
//Color Scale
function drawColorScale() {
  const legendHeight = 300;
  const legendWidth = 60;

  const svg = d3
    .select("#color-scale")
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("transform", `translate(-50,0)`);

  const gradient = svg
    .append("defs")
    .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  const colorStops = d3.range(0, 1.1, 0.1);
  colorStops.forEach((t) => {
    gradient
      .append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(t * 100));
  });

  svg
    .append("rect")
    .attr("width", legendWidth - 40)
    .attr("height", legendHeight - 10)
    .attr("transform", `translate(${legendWidth - 50}, 5)`)
    .style("fill", "url(#gradient)");

  const scale = d3
    .scaleLinear()
    .domain([-1, 1])
    .range([0, legendHeight - 10]);

  const axis = d3.axisRight(scale).tickValues([-1, -0.6, -0.2, 0, 0.2, 0.6, 1]);

  svg
    .append("g")
    .attr("transform", `translate(${legendWidth - 30}, 5)`)
    .call(axis)
    .selectAll("text")
    .style("fill", "white")
    .style("stroke", "white")
    .style("font-size", "10px");
}

//Feature box
function createFeatureList() {
  ctx.features = [
    "acousticness",
    "danceability",
    "energy",
    "speechiness",
    "tempo",
    "valence",
    "explicit",
  ];

  const container = d3
    .select("body")
    .append("div")
    .attr("id", "features-container");

  const boxes = container
    .selectAll(".feature-box")
    .data(ctx.features)
    .enter()
    .append("div")
    .attr("class", "feature-box")
    .text((d) => d)
    .on("click", function (event, d) {
      d3.selectAll(".feature-box")
        .classed("selected", false)
        .style("background-color", "#f0f0f0")
        .style("color", "black");

      d3.select(this)
        .classed("selected", true)
        .style("background-color", "#4caf50")
        .style("color", "white");

      selectedFeature = d;
      updateMapForYearAndFeature();
    });

  d3.select(container.selectAll(".feature-box").node())
    .classed("selected", true)
    .style("background-color", "#4caf50")
    .style("color", "white");

  selectedFeature = ctx.features[0];
}
//Time Slider
function createSlider() {
  const sliderWidth = 600;
  const totalMonths =
    (ctx.endDate.getFullYear() - ctx.startDate.getFullYear()) * 12 +
    ctx.endDate.getMonth() -
    ctx.startDate.getMonth();

  ctx.xScale = d3
    .scaleLinear()
    .domain([0, totalMonths])
    .range([0, sliderWidth]);

  const svg = d3
    .select("#slider")
    .append("svg")
    .attr("width", sliderWidth + 40)
    .attr("height", 50)
    .append("g")
    .attr("transform", "translate(20, 20)");

  svg
    .append("rect")
    .attr("class", "track")
    .attr("width", sliderWidth)
    .attr("height", 6)
    .attr("rx", 3)
    .style("fill", "#ccc");

  ctx.range = svg
    .append("rect")
    .attr("class", "range")
    .attr("height", 6)
    .attr("rx", 3)
    .attr("y", 0)
    .attr("x", 0)
    .attr("width", sliderWidth)
    .style("fill", "#1DB954");

  ctx.handles = svg
    .selectAll(".handle")
    .data([0, totalMonths])
    .enter()
    .append("circle")
    .attr("class", "handle")
    .attr("r", 10)
    .attr("cx", (d) => ctx.xScale(d))
    .style("fill", "#3a9d5b")
    .style("stroke", "#262626")
    .call(
      d3.drag().on("drag", function (event, d) {
        const x = Math.max(0, Math.min(sliderWidth, event.x));
        const months = Math.round(ctx.xScale.invert(x));
        d3.select(this).attr("cx", x).datum(months);
        updateRange();
      })
    );
}

// Update range highlight and display dates
function updateRange() {
  const [startMonths, endMonths] = ctx.handles.data().sort(d3.ascending);

  // Calculate the start and end year and month based on the month index
  const startYear = Math.floor(startMonths / 12) + ctx.startDate.getFullYear();
  const startMonth = startMonths % 12;

  const endYear = Math.floor(endMonths / 12) + ctx.startDate.getFullYear();
  const endMonth = endMonths % 12;

  // Update the range highlight
  ctx.range
    .attr("x", ctx.xScale(startMonths))
    .attr("width", ctx.xScale(endMonths) - ctx.xScale(startMonths));

  // Display the months and years
  d3.select("#start-date").text(`${getMonthName(startMonth)} ${startYear}`);
  d3.select("#end-date").text(`${getMonthName(endMonth)} ${endYear}`);

  // Update the map for the new range
  const newStartDate = new Date(startYear, startMonth, 1);
  const newEndDate = new Date(endYear, endMonth + 1, 0);

  ctx.startDateC = newStartDate;
  ctx.endDateC = newEndDate;

  // Call to update the map with the new date range
  updateMapForYearAndFeature();
}

// Helper function to get the month name
function getMonthName(monthIndex) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return monthNames[monthIndex];
}
//Create Visualization
function createViz() {
  console.log("Using D3 v" + d3.version);
  let svgEl = d3.select("#main").append("svg");
  svgEl.attr("width", ctx.WIDTH);
  svgEl.attr("height", ctx.HEIGHT);
  createFeatureList();
  drawColorScale();
  createChartBase();
  loadData(svgEl);
  createSlider();
}

//Load Data
function loadData(svgEl) {
  const songD = d3.csv("data/song_data_without_genre.csv");
  const globalD = d3.csv("data/CountryStreams/Global.csv");
  const countryGeoJson = d3.json("data/worldMusic.geojson");
  ctx.songs = {};
  Promise.all([songD, countryGeoJson, globalD]).then(
    ([songs, geoJson, global]) => {
      songs.forEach((song) => {
        ctx.songs[song.track_id] = song;
      });
      const cleanedGeoJson = geoJson.features.filter(
        (d) => d.properties && d.properties.name
      );
      ctx.processedData = processTop200(global, songs);
      drawMap(svgEl, cleanedGeoJson); // Draw the map
      updateMapForYearAndFeature(); // Proceed to update map
    }
  );
}

function updateMapForYearAndFeature() {
  drawLines(ctx.processedData);
  if (ctx.startDatec !== lastStartDate || ctx.endDatec !== lastEndDate) {
    d3.text(txtFilePath)
      .then(function (text) {
        const countryFiles = text
          .split("\n")
          .map((file) => file.trim())
          .filter((file) => file.includes("csv")); // Only include CSV files
        return countryFiles;
      })
      .then((countryFiles) => {
        processCorrelationsForCountryFiles(countryFiles, ctx.features);
        lastStartDate = ctx.startDateC;
        lastEndDate = ctx.endDateC;
      })
      .catch((error) => {
        console.error("Error loading country files:", error);
      });
  } else {
    updateMapWithCorrelation(ctx.correlations);
  }
}

//Load one Country Data
function loadCountryData(countryFilePath) {
  return d3.csv(countryFilePath).then((data) => {
    return data.filter((row) => {
      const date = new Date(row.month);
      return date >= ctx.startDateC && date <= ctx.endDateC; // Filter by time period
    });
  });
}

// Function to calculate the correlation for a selected feature
function calculateFeatureCorrelation(countryData, selectedFeature) {
  const featureValues = [];
  const streamValues = [];

  countryData.forEach((row) => {
    const trackId = row.track_id;
    if (ctx.songs[trackId]) {
      const featureValue = parseFloat(
        ctx.songs[trackId][`af_${selectedFeature}`]
      );
      const streamValue = parseFloat(row.streams);
      // Only consider valid data
      if (!isNaN(featureValue) && !isNaN(streamValue)) {
        featureValues.push(featureValue);
        streamValues.push(streamValue);
      }
    }
  });

  // Calculate correlation if there are enough data points
  if (featureValues.length > 1) {
    const meanFeature = d3.mean(featureValues);
    const meanStreams = d3.mean(streamValues);

    const numerator = featureValues.reduce(
      (acc, val, idx) =>
        acc + (val - meanFeature) * (streamValues[idx] - meanStreams),
      0
    );
    const denominator = Math.sqrt(
      featureValues.reduce(
        (acc, val) => acc + Math.pow(val - meanFeature, 2),
        0
      ) *
        streamValues.reduce(
          (acc, val) => acc + Math.pow(val - meanStreams, 2),
          0
        )
    );

    return numerator / denominator;
  }
  return null; // Return null if insufficient data
}

function processCorrelationsForCountryFiles(countryFiles, features) {
  const countryCorrelations = {};
  Promise.all(
    countryFiles.map((filePath) => {
      const countryName = filePath
        .replace(".csv", "")
        .trim()
        .replace(/['",()]/g, ""); // Clean the country name

      return loadCountryData(`data/CountryStreams/${filePath}`).then(
        (countryData) => {
          // Calculate correlation for each feature for the country
          const filteredCountryData = countryData.filter((data) => {
            const dataDate = new Date(data.month); // 'month' is in YYYY-MM format
            return (
              dataDate >= new Date(ctx.startDateC) &&
              dataDate <= new Date(ctx.endDateC)
            );
          });
          const correlations = {};

          features.forEach((feature) => {
            let correlation = 0;
            if (feature == "explicit") {
              let totalExplicitStreams = 0;
              let totalStreams = 0;
              filteredCountryData.forEach((country) => {
                const countryTrackId = country.track_id;
                const countryStreams = parseFloat(country.streams);
                const song = ctx.songs[countryTrackId];
                if (song) {
                  // Check if the song is explicit
                  const isExplicit = song.explicit === "True";
                  if (isExplicit) {
                    totalExplicitStreams =
                      totalExplicitStreams + countryStreams;
                  }
                  totalStreams = totalStreams + countryStreams;
                }
              });
              if (totalStreams > 0) {
                correlation = totalExplicitStreams / totalStreams;
              } else {
                correlation = 0; // No streams, no correlation
              }
            } else {
              correlation = calculateFeatureCorrelation(
                filteredCountryData,
                feature
              );
            }
            correlations[feature] = correlation;
          });
          // Store the correlation results for the country
          countryCorrelations[countryName] = correlations;
        }
      );
    })
  )
    .then(() => {
      // Once all country data has been processed, update the map with correlation data
      ctx.correlations = countryCorrelations;
      updateMapWithCorrelation(countryCorrelations);
    })
    .catch((error) => {
      console.error("Error loading country data:", error);
    });
}

// Function to update the map with the correlation of the selected feature
function updateMapWithCorrelation(correlationResults) {
  const selectedFeatureData = Object.values(correlationResults).map(
    (countryCorrelations) => {
      return countryCorrelations[selectedFeature];
    }
  );
  // Find the minimum and maximum correlation values
  const minCorrelation = d3.min(selectedFeatureData);
  const maxCorrelation = d3.max(selectedFeatureData);
  const colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([minCorrelation, maxCorrelation]);
  d3.selectAll("#world_map path")
    .transition()
    .delay((d, i) => i * 10)
    .ease(d3.easeLinear)
    .attr("fill", (d) => {
      const countryName = d.properties?.name;
      if (countryName && correlationResults[countryName] != null) {
        return colorScale(correlationResults[countryName][selectedFeature]);
      } else {
        return "black";
      }
    })
    .select("title")
    .text((d) => {
      const countryName = d.properties?.name;
      if (countryName && correlationResults[countryName] != null) {
        return `Country: ${
          d.properties.name
        }\nCorrelation: ${correlationResults[countryName][
          selectedFeature
        ].toFixed(4)} `;
      }
    });
}

function processTop200(globalData, songsData) {
  const songMap = new Map();

  // Create a map of track_id to song features
  songsData.forEach((song) => {
    songMap.set(song.track_id, {
      title: song.title,
      artist: song.artist,
      popularity: +song.popularity,
      album: song.album,
      explicit: song.explicit,
      af_danceability: +song.af_danceability,
      af_energy: +song.af_energy,
      af_speechiness: +song.af_speechiness,
      af_acousticness: +song.af_acousticness,
      af_valence: +song.af_valence,
      af_tempo: +song.af_tempo,
    });
  });

  // Group global data by month
  const groupedByMonth = d3.group(globalData, (d) => d.month);

  // Process top 200 for each month
  const result = Array.from(groupedByMonth, ([month, records]) => {
    // Sort by streams in descending order
    const top200 = records
      .sort((a, b) => +b.streams - +a.streams)
      .slice(0, 200)
      .map((record) => {
        const trackId = record.track_id;
        const songFeatures = songMap.get(trackId);
        return {
          month,
          region: record.region,
          streams: record.streams,
          ...songFeatures,
        };
      });

    return { month, songs: top200 };
  });

  return result;
}

function drawLines(data) {
  const { svg, x, y, width, height } = createChartBase();

  // Filter data based on the selected date range
  const startDate = new Date(ctx.startDateC); // Example: "2017-01"
  const endDate = new Date(ctx.endDateC); // Example: "2021-12"

  const filteredData = data.filter((monthEntry) => {
    const monthDate = new Date(monthEntry.month); // Convert month to Date object
    return monthDate >= startDate && monthDate <= endDate;
  });
  if (selectedFeature == "explicit") {
    drawExplicit(filteredData, svg, x, y, width, height);
    return;
  }
  // Calculate the aggregated value for the selected feature (e.g., 'af_danceability')
  const monthlyData = filteredData.map((monthEntry) => {
    const weightedSum = monthEntry.songs
      .slice(0, 200) // Only consider the top 200 songs
      .reduce((sum, song, index) => {
        const weight = 200 - index; // Weight based on rank (higher ranks get higher weights)
        return sum + (song[`af_${selectedFeature}`] || 0) * weight; // Sum of weighted feature values
      }, 0);

    const averageValue = weightedSum / ((200 * (200 + 1)) / 2); // Normalize by the sum of weights (i.e., sum of 1, 2, 3... 200)

    return {
      month: monthEntry.month,
      value: averageValue,
    };
  });

  // Update the X and Y scales based on the data
  x.domain(monthlyData.map((d) => d.month));
  // Set the Y domain based on the minimum and maximum average values
  const yMin = d3.min(monthlyData, (d) => d.value);
  const yMax = d3.max(monthlyData, (d) => d.value);
  y.domain([yMin, yMax]).nice();

  svg.select(".y-axis").call(d3.axisLeft(y));

  const line = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.value));

  svg
    .append("path")
    .datum(monthlyData)
    .transition()
    .delay((d, i) => i * 20)
    .ease(d3.easeLinear)
    .attr("fill", "none")
    .attr("stroke", "#1db954")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg
    .selectAll(".dot")
    .data(monthlyData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.month))
    .attr("cy", (d) => y(d.value))
    .attr("r", 4)
    .attr("fill", "white")
    .append("title")
    .text(
      (d) =>
        `Month: ${d.month}\nValue: ${d.value.toFixed(2)} ${selectedFeature}`
    );
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthsToShow = 5;
  const step = Math.floor(monthlyData.length / monthsToShow);
  const tickValues = monthlyData
    .filter((_, index) => index % step === 0)
    .map((d) => d.month);

  // Update the X axis with a limited number of ticks and month names
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(tickValues)
        .tickFormat((d) => {
          const monthIndex = new Date(d).getMonth();
          return monthNames[monthIndex] + " " + new Date(d).getFullYear();
        })
    )
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .attr("dx", "2em");
}

function drawExplicit(data, svg, x, y, width, height) {
  const monthlyDataTrue = data.map((monthEntry) => {
    const weightedSumTrue = monthEntry.songs
      .filter((song) => song.explicit === "True") // Filter for True explicit songs
      .slice(0, 200) // Only consider the top 200 songs
      .reduce((sum, song, index) => {
        const weight = 200 - index;
        return sum + weight;
      }, 0);

    const averageValueTrue = weightedSumTrue / ((200 * (200 + 1)) / 2); // Normalize by the sum of weights

    return {
      month: monthEntry.month,
      value: averageValueTrue,
    };
  });

  const monthlyDataFalse = data.map((monthEntry) => {
    const weightedSumFalse = monthEntry.songs
      .filter((song) => song.explicit === "False") // Filter for False explicit songs
      .slice(0, 200)
      .reduce((sum, song, index) => {
        const weight = 200 - index;
        return sum + weight;
      }, 0);
    const averageValueFalse = weightedSumFalse / ((200 * (200 + 1)) / 2);
    return {
      month: monthEntry.month,
      value: averageValueFalse,
    };
  });
  const allData = [...monthlyDataTrue, ...monthlyDataFalse];
  const minValue = d3.min(allData, (d) => d.value);
  const maxValue = d3.max(allData, (d) => d.value);
  // Update the X and Y scales based on the data
  x.domain(monthlyDataTrue.map((d) => d.month));
  y.domain([minValue, maxValue]).nice();
  svg.select(".y-axis").call(d3.axisLeft(y));
  const lineTrue = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.value));

  const lineFalse = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.value));

  svg
    .append("path")
    .datum(monthlyDataTrue)
    .transition()
    .delay((d, i) => i * 20)
    .ease(d3.easeLinear)
    .attr("fill", "none")
    .attr("stroke", "#1db954")
    .attr("stroke-width", 2)
    .attr("d", lineTrue);

  svg
    .append("path")
    .datum(monthlyDataFalse)
    .transition()
    .delay((d, i) => i * 20)
    .ease(d3.easeLinear)
    .attr("fill", "none")
    .attr("stroke", "#FF6F6F")
    .attr("stroke-width", 2)
    .attr("d", lineFalse);

  svg
    .selectAll(".dotTrue")
    .data(monthlyDataTrue)
    .enter()
    .append("circle")
    .attr("class", "dotTrue")
    .attr("cx", (d) => x(d.month))
    .attr("cy", (d) => y(d.value))
    .attr("r", 4)
    .attr("fill", "white")
    .append("title")
    .text((d) => `Month: ${d.month}\nValue: ${d.value.toFixed(2)} (True)`);

  svg
    .selectAll(".dotFalse")
    .data(monthlyDataFalse)
    .enter()
    .append("circle")
    .attr("class", "dotFalse")
    .attr("cx", (d) => x(d.month))
    .attr("cy", (d) => y(d.value))
    .attr("r", 4)
    .attr("fill", "white")
    .append("title")
    .text((d) => `Month: ${d.month}\nValue: ${d.value.toFixed(2)} (False)`);

  const monthsToShow = 5;
  const step = Math.floor(monthlyDataTrue.length / monthsToShow);
  const tickValues = monthlyDataTrue
    .filter((_, index) => index % step === 0)
    .map((d) => d.month);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(tickValues)
        .tickFormat((d) => {
          const monthIndex = new Date(d).getMonth();
          return monthNames[monthIndex] + " " + new Date(d).getFullYear();
        })
    )
    .selectAll("text")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .attr("dx", "2em");

  // Create a legend for the lines: Positive and Negative
  const legendWidth = 90;
  const legendHeight = 20;

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - legendWidth - 100}, ${-20})`);

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "#1db954"); // Green for True (Positive)

  legend
    .append("text")
    .attr("x", legendWidth + 10)
    .attr("y", legendHeight / 2)
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .style("fill", "white")
    .text("Positive Explicit");

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("y", legendHeight + 10)
    .style("fill", "#FF6F6F"); //Red for False (Negative)

  legend
    .append("text")
    .attr("x", legendWidth + 10)
    .attr("y", legendHeight * 1.5)
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .style("fill", "white")
    .text("Negative Explicit");
}

function createChartBase() {
  d3.select("#chart").selectAll("*").remove();
  const margin = { top: 20, right: 30, bottom: 80, left: 50 };
  const width = 1200 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scalePoint().range([0, width]).padding(0.5);
  const y = d3.scaleLinear().range([height, 0]);
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "x-axis");

  svg.append("g").attr("class", "y-axis");

  return { svg, x, y, width, height };
}
