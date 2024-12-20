const ctx = {
  CHART_WIDTH: 700,
  CHART_HEIGHT: 400,
  DATA_PATH_POP: "data\\universal_top_spotify_songs.csv",
  DATA_PATH_GRAPH_EDGES: "data\\edges.csv",
  DATA_PATH_GRAPH_NODES: "data\\nodes.csv",
  DATA_PATH_MAP: "data\\world.geo.json",
  ARTIST_DATA: [],
  RANKED_ARTISTS: [],
  ALBUM_LIST: [],
  NODES: [],
  EDGES: [],
  START_DATE: new Date(2023, 10, 18),
  END_DATE: new Date(2024, 11, 27),
  WIDTH: 1400,
  HEIGHT: 800,
  MARGINS: { top: 40, right: 50, bottom: 50, left: 70 },
  ARTISTS_LIST: [],
  SONG_LIST: [],
  MIN_COUNT: 2600,
  ANIM_DURATION: 600,
  ARTIST_ID: "data\\top10k-spotify-artist-metadata.csv",
  NODE_SIZE_NLD: 7,
  NODE_SIZE_GEO: 7,
  LINK_ALPHA: 0.2,
  SELECTED_ARTIST: "",
  get INNER_WIDTH() {
    return this.CHART_WIDTH - this.MARGINS.left - this.MARGINS.right;
  },
  get INNER_HEIGHT() {
    return this.CHART_HEIGHT - this.MARGINS.top - this.MARGINS.bottom;
  },
};

const QUAD_ANGLE = Math.PI / 4;

const simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3
      .forceLink()
      .id(function (d) {
        return d.id;
      })
      .distance(5)
      .strength(0.08)
  )
  .force("charge", d3.forceManyBody())
  .force("center", d3.forceCenter(ctx.WIDTH / 2, ctx.HEIGHT / 2));

function createMap(topojson) {
  let width = 700;
  let height = 320;
  let marginTop = 50;
  let marginBottom = 80;
  let validRanks = topojson.features
    .map((d) => d.properties.averageRank)
    .filter((rank) => rank > 0);

  let rankExtent = d3.extent(validRanks);
  const rankLogScale = d3.scaleLog().domain(rankExtent);
  const rankColorScale = d3.scaleSequential((d) =>
    d3.interpolateViridis(rankLogScale(d))
  );
  const svg = d3
    .select("#other-right")
    .append("svg")
    .attr("width", width)
    .attr("height", height + marginTop + marginBottom)
    .attr(
      "viewBox",
      `0 ${-marginTop} ${width} ${height + marginTop + marginBottom}`
    );
  const map = svg.append("g");
  let geoPathGen = d3.geoPath().projection(
    d3
      .geoMercator()
      .scale(80)
      .translate([width / 2, height / 2 + 50])
  );

  map
    .selectAll("path")
    .data(topojson.features)
    .enter()
    .append("path")
    .attr("d", geoPathGen)
    .style("fill", (d) => {
      let rank = d.properties.averageRank;
      return rank > 0 ? rankColorScale(rank) : "#ccc";
    })
    .attr("stroke", "white")
    .classed("state", true);
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("fill", "white")
    .text("Average Rank by Country for 2024");
  let legendHeight = 200;
  let legendWidth = 15;
  let legendMargin = { top: 30, left: 20 };
  const legendGroup = svg
    .append("g")
    .attr("transform", `translate(${legendMargin.left}, ${legendMargin.top})`);
  const legendScale = d3.scaleLog().domain(rankExtent).range([legendHeight, 0]);
  const legendAxis = d3
    .axisRight(legendScale)
    .tickValues(rankExtent.concat(d3.mean(rankExtent)))
    .tickFormat(d3.format(".2f"));
  const legendData = d3.range(legendHeight);

  legendGroup
    .selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d) => d)
    .attr("width", legendWidth)
    .attr("height", 1)
    .style("fill", (d) => rankColorScale(legendScale.invert(d)));
  const legendAxisGroup = legendGroup
    .append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);
  legendAxisGroup.selectAll(".tick text").style("fill", "white");

  legendAxisGroup.selectAll(".domain").style("stroke", "white");
}

function loadData(artist) {
  let promises = [
    d3.csv(ctx.DATA_PATH_POP),
    d3.json(ctx.DATA_PATH_MAP),
    d3.csv(ctx.ARTIST_ID),
  ];

  Promise.all(promises)
    .then(function (data) {
      const separatedData = [];
      data[0].forEach((d) => {
        const artists = d.artists.split(",").map((a) => a.trim());
        artists.forEach((a) => {
          separatedData.push({ ...d, artists: a });
        });
      });

      //console.log("Separated Data:", separatedData);

      const specificArtistData = separatedData.filter(
        (d) => d.artists.toLowerCase() === artist.toLowerCase()
      );
      const artistIds = data[2].filter(
        (d) => d.artist.toLowerCase() === artist.toLowerCase()
      );
      const artistByCountry = d3.group(specificArtistData, (d) => d.country);
      const averageRankByCountry = Array.from(
        artistByCountry,
        ([country, entries]) => ({
          artist: artist,
          country: country,
          averageRank: d3.mean(entries, (d) =>
            d.daily_rank ? +d.daily_rank : 0
          ),
        })
      );
      // console.log("average rank by country: ", averageRankByCountry);
      //console.log("Specific Artist Data:", specificArtistData);
      data[1].features.forEach((feature) => {
        const postal = feature.properties.postal;
        const matchingRank = averageRankByCountry.find(
          (rank) => rank.country === postal
        );
        feature.properties.averageRank = matchingRank
          ? matchingRank.averageRank
          : null;
      });
      let averageDanceability = d3.mean(specificArtistData, (d) => {
        return d.danceability ? +d.danceability : 0;
      });
      let averageEnergy = d3.mean(specificArtistData, (d) => {
        return d.energy ? +d.energy : 0;
      });
      let averageLoudness = d3.mean(specificArtistData, (d) => {
        return d.danceability ? +d.danceability : 0;
      });

      let averageValence = d3.mean(specificArtistData, (d) => {
        return d.valence ? +d.valence : 0;
      });

      let averageTempo = d3.mean(specificArtistData, (d) => {
        return d.tempo ? +d.tempo : 0;
      });
      const groupedDataByAlbum = d3.group(
        specificArtistData,
        (d) => d.album_name
      );
      const rankedAlbums = Array.from(
        groupedDataByAlbum,
        ([name, entries]) => ({
          album_name: name,
          count: entries.length,
        })
      ).sort((a, b) => b.count - a.count);

      // console.log("Ranked Albums:", rankedAlbums);
      ctx.ALBUM_LIST = rankedAlbums;
      const groupedData = d3.group(specificArtistData, (d) => d.snapshot_date);
      const groupedDataBySong = d3.group(specificArtistData, (d) => d.name);
      const rankedSongs = Array.from(groupedDataBySong, ([name, entries]) => ({
        name: name,
        count: entries.length,
      })).sort((a, b) => b.count - a.count);
      console.log(rankedSongs);
      ctx.SONG_LIST = rankedSongs;

      const specificArtistAverageData = Array.from(
        groupedData,
        ([date, entries]) => ({
          artist: artist,
          date: date,
          averageDailyRank: d3.mean(entries, (d) =>
            d.daily_rank ? +d.daily_rank : 0
          ),
        })
      );

      //console.log("Averaged Data:", specificArtistAverageData);

      ctx.ARTIST_DATA = ctx.ARTIST_DATA || [];
      ctx.ARTIST_DATA.push(...specificArtistAverageData);

      // console.log("Context Artist Data:", ctx.ARTIST_DATA);
      artistId(artistIds);
      createMap(data[1]);
      popularityEvolutionGraph();
      topSongsGraph();
      topAlbumsGraph();
      attributeRadar(
        separatedData,
        averageDanceability,
        averageEnergy,
        averageLoudness,
        averageValence,
        averageTempo
      );
    })
    .catch(function (error) {
      console.error("Error loading data:", error);
    });
}

function createTooltip() {
  return d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "black")
    .style("color", "white")
    .style("padding", "5px 10px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);
}

function topSongsGraph() {
  const top5 = ctx.SONG_LIST.slice(0, 5);
  const width = 400 - ctx.MARGINS.left - ctx.MARGINS.right;
  const height = 200 - ctx.MARGINS.top - ctx.MARGINS.bottom;
  const tooltip = createTooltip();
  const g = d3
    .select("#layout")
    .append("g")
    .attr(
      "transform",
      `translate(${1400 - width - ctx.MARGINS.left - ctx.MARGINS.right}, ${
        ctx.MARGINS.top
      })`
    );

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("fill", "white")
    .style("font-size", "16px")
    .text("Top Songs");

  const yScale = d3
    .scaleBand()
    .domain(
      top5.map((d) =>
        d.name.length > 15 ? d.name.slice(0, 12) + "..." : d.name
      )
    )
    .range([0, height])
    .padding(0);

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(top5, (d) => d.count)])
    .nice()
    .range([0, width]);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + ctx.MARGINS.bottom / 2 + 10)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Number of Chart Entries");

  g.append("text")
    .attr("x", -height / 2)
    .attr("y", -ctx.MARGINS.left - 30)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Song Name");

  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("fill", "white");

  g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .selectAll("text")
    .style("fill", "white");

  g.selectAll(".domain, .tick line").style("stroke", "white");

  g.selectAll(".bar")
    .data(top5)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", (d) =>
      yScale(d.name.length > 15 ? d.name.slice(0, 12) + "..." : d.name)
    )
    .attr("x", 0)
    .attr("height", yScale.bandwidth())
    .attr("width", (d) => xScale(d.count))
    .attr("fill", "#1DB954")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(d.name);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("top", `${event.pageY - 10}px`)
        .style("left", `${event.pageX + 10}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  g.selectAll(".label")
    .data(top5)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", (d) =>
      xScale(d.count) < 30 ? xScale(d.count) + 5 : xScale(d.count) - 5
    )
    .attr(
      "y",
      (d) =>
        yScale(d.name.length > 15 ? d.name.slice(0, 12) + "..." : d.name) +
        yScale.bandwidth() / 2 +
        5
    )
    .attr("text-anchor", (d) => (xScale(d.count) < 30 ? "start" : "end"))
    .style("fill", "white")
    .style("font-size", "12px")
    .text((d) => d.count);
}

function topAlbumsGraph() {
  const top5 = ctx.ALBUM_LIST.slice(0, 5);
  const width = 400 - ctx.MARGINS.left - ctx.MARGINS.right;
  const height = 200 - ctx.MARGINS.top - ctx.MARGINS.bottom;
  const tooltip = createTooltip();
  const g = d3
    .select("#layout")
    .append("g")
    .attr(
      "transform",
      `translate(${1400 - width - ctx.MARGINS.left - ctx.MARGINS.right}, ${
        200 + ctx.MARGINS.top
      })`
    );

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("fill", "white")
    .style("font-size", "16px")
    .text("Top Albums");

  const yScale = d3
    .scaleBand()
    .domain(
      top5.map((d) =>
        d.album_name.length > 15
          ? d.album_name.slice(0, 12) + "..."
          : d.album_name
      )
    )
    .range([0, height])
    .padding(0);

  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(top5, (d) => d.count)])
    .nice()
    .range([0, width]);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + ctx.MARGINS.bottom / 2 + 10)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Number of Chart Entries");

  g.append("text")
    .attr("x", -height / 2)
    .attr("y", -ctx.MARGINS.left - 30)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Album Name");

  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("fill", "white");

  g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .selectAll("text")
    .style("fill", "white");

  g.selectAll(".domain, .tick line").style("stroke", "white");

  g.selectAll(".bar")
    .data(top5)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", (d) =>
      yScale(
        d.album_name.length > 15
          ? d.album_name.slice(0, 12) + "..."
          : d.album_name
      )
    )
    .attr("x", 0)
    .attr("height", yScale.bandwidth())
    .attr("width", (d) => xScale(d.count))
    .attr("fill", "#1DB954")
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(d.album_name);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("top", `${event.pageY - 10}px`)
        .style("left", `${event.pageX + 10}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  g.selectAll(".label")
    .data(top5)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", (d) =>
      xScale(d.count) < 30 ? xScale(d.count) + 5 : xScale(d.count) - 5
    )
    .attr(
      "y",
      (d) =>
        yScale(
          d.album_name.length > 15
            ? d.album_name.slice(0, 12) + "..."
            : d.album_name
        ) +
        yScale.bandwidth() / 2 +
        5
    )
    .attr("text-anchor", (d) => (xScale(d.count) < 30 ? "start" : "end"))
    .style("fill", "white")
    .style("font-size", "12px")
    .text((d) => d.count);
}

function popularityEvolutionGraph() {
  const margins = ctx.MARGINS;
  const innerWidth = ctx.INNER_WIDTH;
  const innerHeight = ctx.INNER_HEIGHT;
  // Fix the scales
  const oldestDate = d3.min(ctx.ARTIST_DATA, (d) => new Date(d.date));
  // console.log("Oldest date:", oldestDate);

  const dateScale = d3
    .scaleTime()
    .domain([oldestDate, ctx.END_DATE])
    .range([0, innerWidth]);

  const minPop = d3.min(ctx.ARTIST_DATA, (d) => d.averageDailyRank);
  const maxPop = d3.max(ctx.ARTIST_DATA, (d) => d.averageDailyRank);

  const popularityScale = d3
    .scaleLinear()
    .domain([maxPop, minPop])
    .range([innerHeight, 0]);

  const g = d3.select("#popularity-evolution");
  const chartGroup = g
    .append("g")
    .attr("transform", `translate(${margins.left}, ${margins.top})`);

  g.append("text")
    .attr("x", ctx.CHART_WIDTH / 2)
    .attr("y", margins.top / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "16px")
    .text("Artist Popularity Evolution Over Time (Oct 2023 - Nov 2024)");

  const xAxis = d3
    .axisBottom(dateScale)
    .ticks(d3.timeMonth.every(1))
    .tickFormat(d3.timeFormat("%b"));

  chartGroup
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .selectAll("path, line")
    .attr("stroke", "white");
  chartGroup.selectAll(".tick text").attr("fill", "white");

  chartGroup
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + margins.bottom / 2 + 10)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Date");

  const yAxis = d3.axisLeft(popularityScale).ticks(5);

  chartGroup
    .append("g")
    .call(yAxis)
    .selectAll("path, line")
    .attr("stroke", "white");

  chartGroup.selectAll(".tick text").attr("fill", "white");

  chartGroup
    .append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -margins.left / 2)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "white")
    .style("font-size", "12px")
    .text("Average Daily Rank");

  const line = d3
    .line()
    .x((d) => dateScale(new Date(d.date)))
    .y((d) => popularityScale(d.averageDailyRank));

  chartGroup
    .append("path")
    .datum(ctx.ARTIST_DATA)
    .attr("fill", "none")
    .attr("stroke", "#1DB954")
    .attr("stroke-width", 2)
    .attr("d", line);

  chartGroup
    .selectAll("circle")
    .data(ctx.ARTIST_DATA)
    .enter()
    .append("circle")
    .attr("cx", (d) => dateScale(new Date(d.date)))
    .attr("cy", (d) => popularityScale(d.averageDailyRank))
    .attr("r", 1)
    .attr("fill", "#1DB954");
}

function calculateNodeDegrees(nodes, edges) {
  nodes.forEach((node) => {
    node.degree = 0;
  });
  edges.forEach((edge) => {
    const sourceNode = nodes.find((node) => node.spotify_id === edge.id_0);
    const targetNode = nodes.find((node) => node.spotify_id === edge.id_1);

    if (!sourceNode || !targetNode) {
      console.warn("Edge refers to undefined nodes:", edge);
      return;
    }
    sourceNode.degree += 1;
    targetNode.degree += 1;
  });
  return nodes;
}

function getCurve(x1, y1, x2, y2) {
  if (
    x1 === undefined ||
    y1 === undefined ||
    x2 === undefined ||
    y2 === undefined
  ) {
    console.error("Invalid coordinates for curve:", { x1, y1, x2, y2 });
    return "";
  }
  const alpha = Math.atan2(y2 - y1, x2 - x1);
  const ds = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2.0;
  const rho = ds / Math.cos(QUAD_ANGLE);
  const cpx = x1 + rho * Math.cos(alpha + QUAD_ANGLE);
  const cpy = y1 + rho * Math.sin(alpha + QUAD_ANGLE);
  return `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`;
}

function rankArtistsWorldWide(data) {
  let filteredData = data.filter((d) => d.country == "");
  const separatedData = [];
  filteredData.forEach((d) => {
    const artists = d.artists.split(",").map((artist) => artist.trim());
    artists.forEach((artist) => {
      separatedData.push({ ...d, artists: artist });
    });
  });
  //console.log(separatedData);
  const groupedData = d3.group(separatedData, (d) => d.artists);
  const artistsRanked = Array.from(groupedData, ([artists, entries]) => ({
    artist: artists,
    averageArtistRank: d3.mean(entries, (d) => +d.daily_rank),
  }));
  artistsRanked.sort((a, b) => a.averageArtistRank - b.averageArtistRank);
  ctx.RANKED_ARTISTS.push(...artistsRanked);
  //console.log(ctx.RANKED_ARTISTS);
}

function selectGraphData(edges, nodes) {
  const rankedArtistsSet = new Set(ctx.RANKED_ARTISTS.map((d) => d.artist));
  const filteredNodeData = nodes.filter((d) => rankedArtistsSet.has(d.name));
  const filteredNodeIds = new Set(filteredNodeData.map((d) => d.spotify_id));
  const filteredEdgeData = edges.filter(
    (edge) => filteredNodeIds.has(edge.id_0) && filteredNodeIds.has(edge.id_1)
  );

  ctx.NODES = filteredNodeData;
  ctx.EDGES = filteredEdgeData;

  if (ctx.NODES.length === 0 || ctx.EDGES.length === 0) {
    console.error("No valid nodes or edges to display.");
  }

  calculateNodeDegrees(ctx.NODES, ctx.EDGES);
  ctx.NODES = ctx.NODES.filter((node) => node.degree > 0);
  //console.log("Filtered Edges:", ctx.EDGES);
  //console.log("Filtered Nodes:", ctx.NODES);
}

function createGraphLayout() {
  if (ctx.NODES.length === 0 || ctx.EDGES.length === 0) {
    console.error("No data to display in the graph.");
    return;
  }
  let svg = d3.select("svg");
  if (svg.empty()) {
    svg = d3
      .select("body")
      .append("svg")
      .attr("width", ctx.WIDTH)
      .attr("height", ctx.HEIGHT)
      .call(
        d3.zoom().on("zoom", (event) => {
          svg.attr("transform", event.transform);
        })
      )
      .append("g");
  }

  // Add title and subtitle
  let titleContainer = d3
    .select("body")
    .append("div")
    .attr("id", "graph-title-container")
    .style("text-align", "center")
    .style("margin-top", "10px")
    .style("font-family", "Arial, sans-serif");

  /*titleContainer
    .append("h1")
    .text("Artist Collaboration Graph")
    .style("font-size", "24px")
    .style("color", "white");*/

  /*titleContainer
    .append("p")
    .text(
      "Search for an artist and explore artist their network. Click on an artist to see details about them"
    )
    .style("font-size", "14px")
    .style("font-style", "italic")
    .style("color", "white");*/

  const degreeCentralityExtent = d3.extent(ctx.NODES, (d) => d.degree || 1);
  const centralityColor = d3
    .scaleSequential(d3.interpolateViridis)
    .domain(degreeCentralityExtent);

  const lines = svg
    .append("g")
    .attr("id", "collaborationG")
    .selectAll("path")
    .data(ctx.EDGES)
    .enter()
    .append("path")
    .attr("stroke", "white")
    .attr("stroke-opacity", 0)
    .attr("fill", "none");

  const circles = svg
    .append("g")
    .attr("id", "artistG")
    .selectAll("circle")
    .data(ctx.NODES)
    .enter()
    .append("circle")
    .attr("r", ctx.NODE_SIZE_NLD)
    .attr("fill", (d) => centralityColor(d.degree))
    .attr("cx", (d) => d.x || 0)
    .attr("cy", (d) => d.y || 0)
    .on("click", (event, d) => {
      ctx.SELECTED_ARTIST = d.name;
      loadData(d.name);
      setTimeout(() => {
        window.location.href = `artist_detail.html?spotify_id=${
          d.spotify_id
        }&name=${encodeURIComponent(d.name)}`;
      }, 300);
    })
    .call(
      d3
        .drag()
        .on("start", startDragging)
        .on("drag", dragging)
        .on("end", endDragging)
    );

  circles.append("title").text(function (d) {
    return d.name;
  });

  const labels = svg
    .append("g")
    .attr("id", "labelG")
    .selectAll("text")
    .data(ctx.NODES)
    .enter()
    .append("text")
    .text((d) => d.name)
    .attr("x", (d) => d.x || 0)
    .attr("y", (d) => (d.y || 0) - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("fill", "none")
    .attr("opacity", 0);

  simulation.nodes(ctx.NODES).on("tick", simStep);
  simulation.force("link").links(ctx.EDGES);

  function simStep() {
    lines.attr("d", (d) => {
      const source = ctx.NODES.find((node) => node.spotify_id === d.id_0);
      const target = ctx.NODES.find((node) => node.spotify_id === d.id_1);
      return getCurve(source?.x, source?.y, target?.x, target?.y);
    });
    circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    labels.attr("x", (d) => d.x).attr("y", (d) => d.y - 20);
  }
}

function connectedArtitSelection() {
  let promises = [
    d3.csv(ctx.DATA_PATH_POP),
    d3.csv(ctx.DATA_PATH_GRAPH_EDGES),
    d3.csv(ctx.DATA_PATH_GRAPH_NODES),
  ];

  Promise.all(promises)
    .then(function (data) {
      rankArtistsWorldWide(data[0]);
      selectGraphData(data[1], data[2]);
      createGraphLayout();
    })
    .catch(function (error) {
      console.log(error);
    });
}

function createViz() {
  loadArtistList();
  connectedArtitSelection();
}

function startDragging(event, node) {
  if (ctx.mapMode) {
    return;
  }
  if (!event.active) {
    simulation.alphaTarget(0.3).restart();
  }
  node.fx = node.x;
  node.fy = node.y;
}

function dragging(event, node) {
  if (ctx.mapMode) {
    return;
  }
  node.fx = event.x;
  node.fy = event.y;
}

function endDragging(event, node) {
  if (ctx.mapMode) {
    return;
  }
  if (!event.active) {
    simulation.alphaTarget(0);
  }
  node.fx = null;
  node.fy = null;
}

function handleKeyEvent(e) {
  if (e.keyCode === 84) {
    // hit T
    toggleMap();
  }
}

function toggleMap() {
  ctx.mapMode = !ctx.mapMode;
  switchVis(ctx.mapMode);
}

function highlightArtist() {
  const artistName = document.getElementById("search-bar").value.trim();
  if (!artistName) {
    resetHighlight();
    return;
  }

  const selectedNode = ctx.NODES.find(
    (node) => node.name.toLowerCase() === artistName.toLowerCase()
  );

  if (!selectedNode) {
    alert("Artist not found!");
    resetHighlight();
    return;
  }

  const connectedEdges = ctx.EDGES.filter(
    (edge) =>
      edge.id_0 === selectedNode.spotify_id ||
      edge.id_1 === selectedNode.spotify_id
  );

  const connectedNodeIds = new Set(
    connectedEdges.flatMap((edge) => [edge.id_0, edge.id_1])
  );

  d3.selectAll("#artistG circle")
    .transition()
    .delay((d, i) => i * 20)
    .duration(300)
    .attr("fill", (d) => {
      if (d.spotify_id === selectedNode.spotify_id) {
        return "#1DB954";
      } else if (connectedNodeIds.has(d.spotify_id)) {
        return "#8caba8";
      } else {
        return "#E0E0E0";
      }
    })
    .attr("opacity", (d) =>
      connectedNodeIds.has(d.spotify_id) ||
      d.spotify_id === selectedNode.spotify_id
        ? 1
        : 0.1
    )
    .attr("r", (d) =>
      d.spotify_id === selectedNode.spotify_id
        ? ctx.NODE_SIZE_NLD * 4
        : ctx.NODE_SIZE_NLD * 3
    );

  d3.selectAll("#collaborationG path")
    .transition()
    .duration(300)
    .attr("stroke", "orange")
    .attr("stroke-opacity", (d) =>
      d.id_0 === selectedNode.spotify_id || d.id_1 === selectedNode.spotify_id
        ? 1
        : 0
    );

  d3.selectAll("#labelG text")
    .transition()
    .duration(300)
    .attr("fill", (d) =>
      d.spotify_id === selectedNode.spotify_id
        ? "white"
        : connectedNodeIds.has(d.spotify_id)
        ? "white"
        : "none"
    )
    .attr("font-weight", (d) =>
      d.spotify_id === selectedNode.spotify_id ? "bold" : "normal"
    )
    .attr("opacity", (d) =>
      connectedNodeIds.has(d.spotify_id) ||
      d.spotify_id === selectedNode.spotify_id
        ? 1
        : 0
    );
}

function resetHighlight() {
  const degreeCentralityExtent = d3.extent(ctx.NODES, (d) => d.degree);
  const degreeCentralityLogScale = d3.scaleLog().domain(degreeCentralityExtent);
  const centralityColor = d3.scaleSequential((d) =>
    d3.interpolateViridis(degreeCentralityLogScale(d))
  );
  d3.selectAll("#artistG circle")
    .transition()
    .duration(300)
    .attr("fill", (d) => centralityColor(d.degree))
    .attr("opacity", 1)
    .attr("r", ctx.NODE_SIZE_NLD);
  d3.selectAll("#collaborationG path")
    .transition()
    .duration(300)
    .attr("stroke-opacity", 0);
  d3.selectAll("#labelG text")
    .transition()
    .duration(300)
    .attr("fill", "none")
    .attr("opacity", 0);
}

function loadArtistList() {
  d3.csv(ctx.DATA_PATH_GRAPH_NODES)
    .then((data) => {
      ctx.ARTISTS_LIST = data.map((node) => node.name);
      //console.log("ARTISTS_LIST loaded:", ctx.ARTISTS_LIST);
    })
    .catch((error) => {
      console.error("Error loading artist list:", error);
    });
}

function filterArtists() {
  const searchInput = document.getElementById("search-bar").value.toLowerCase();
  const suggestionsDiv = document.getElementById("suggestions");
  suggestionsDiv.innerHTML = "";

  if (searchInput.length === 0) {
    return;
  }

  // Use ctx.NODES and filter by the 'name' attribute
  const filteredArtists = ctx.NODES.filter((node) =>
    node.name.toLowerCase().includes(searchInput)
  );

  // Create suggestions for each filtered artist
  filteredArtists.forEach((node) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.textContent = node.name; // Use the 'name' attribute for display
    suggestionItem.className = "suggestion-item";
    suggestionItem.onclick = () => {
      document.getElementById("search-bar").value = node.name; // Set the input value to the 'name'
      suggestionsDiv.innerHTML = "";
    };
    suggestionsDiv.appendChild(suggestionItem);
  });
}

function createVizDetails() {
  loadData("Yoko Ono");
}

function attributeRadar(data, danceability, energy, loudness, valence, tempo) {
  const width = 350 - ctx.MARGINS.left - ctx.MARGINS.right,
    height = 400 - ctx.MARGINS.bottom - ctx.MARGINS.top;
  const radius = Math.min(width, height) / 2 - 50;
  const categories = ["Danceability", "Energy", "Loudness", "Valence", "Tempo"];
  const values = [danceability, energy, loudness, valence, tempo];
  const scales = [
    d3.scaleLinear().domain([0, 1]).range([0, radius]),
    d3.scaleLinear().domain([0, 1]).range([0, radius]),
    d3.scaleLinear().domain([-37.5, 4.3]).range([0, radius]),
    d3.scaleLinear().domain([0, 1]).range([0, radius]),
    d3.scaleLinear().domain([0, 236]).range([0, radius]),
  ];
  const angleSlice = (Math.PI * 2) / categories.length;

  const svg = d3
    .select("#attribute-viz")
    .append("svg")
    .attr("width", width + ctx.MARGINS.left + ctx.MARGINS.right)
    .attr("height", height + ctx.MARGINS.top + ctx.MARGINS.bottom + 50)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2 + 80})`);

  svg
    .append("text")
    .attr("x", 0)
    .attr("y", -radius - 70)
    .style("text-anchor", "middle")
    .style("fill", "white")
    .style("font-size", "16px")
    .text("Attribute Radar Chart");
  const gridValues = [1, 2, 3, 4, 5];
  gridValues.forEach((d) => {
    svg
      .append("circle")
      .attr("r", (radius / 5) * d)
      .style("fill", "none")
      .style("stroke", "white")
      .style("stroke-width", 1);
  });

  svg
    .selectAll(".axis")
    .data(categories)
    .enter()
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr(
      "x2",
      (d, i) =>
        scales[i](scales[i].domain()[1]) *
        Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y2",
      (d, i) =>
        scales[i](scales[i].domain()[1]) *
        Math.sin(angleSlice * i - Math.PI / 2)
    )
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  svg
    .selectAll(".axisLabel")
    .data(categories)
    .enter()
    .append("text")
    .attr(
      "x",
      (d, i) =>
        (scales[i](scales[i].domain()[1]) + 20) *
        Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y",
      (d, i) =>
        (scales[i](scales[i].domain()[1]) + 20) *
        Math.sin(angleSlice * i - Math.PI / 2)
    )
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text((d) => d);

  const radarLine = d3
    .lineRadial()
    .radius((d, i) => scales[i](d))
    .angle((d, i) => angleSlice * i);

  svg
    .append("path")
    .datum(values)
    .attr("d", radarLine)
    .style("fill", "rgba(30, 215, 96, 0.5)")
    .style("stroke", "#1DB954")
    .style("stroke-width", 2);
}

const ALBERS_PROJ = d3
  .geoAlbersUsa()
  .translate([ctx.WIDTH / 2, ctx.HEIGHT / 2])
  .scale([1000]);
const geoPathGen = d3.geoPath().projection(ALBERS_PROJ);

function artistId(artist) {
  const spaceWidth = 600;
  const spaceHeight = 400;

  const rectWidth = 500 - ctx.MARGINS.left - ctx.MARGINS.right;
  const rectHeight = 300 - ctx.MARGINS.bottom - ctx.MARGINS.top;

  const photoRadius = 40;
  const textSpacing = 20;

  const group = d3
    .select("#artist-id")
    .attr("transform", `translate(${spaceWidth / 2.5}, ${spaceHeight / 2})`);

  group
    .append("rect")
    .attr("width", rectWidth)
    .attr("height", rectHeight)
    .attr("rx", 20)
    .attr("ry", 20)
    .attr("x", -rectWidth / 2)
    .attr("y", -rectHeight / 2)
    .style("fill", "rgba(30, 215, 96, 0.4)")
    .style("stroke", "rgb(30, 215, 96)")
    .style("stroke-width", 2);
  group
    .append("circle")
    .attr("cx", -rectWidth / 2 + photoRadius + 20)
    .attr("cy", -rectHeight / 2 + photoRadius + 20)
    .attr("r", photoRadius)
    .style("fill", "white")
    .style("stroke", "rgb(30, 215, 96)")
    .style("stroke-width", 2);

  const photoUrl = "data\\note.png";
  group
    .append("image")
    .attr("x", -rectWidth / 2 + photoRadius + 20 - photoRadius)
    .attr("y", -rectHeight / 2 + photoRadius + 20 - photoRadius)
    .attr("width", photoRadius * 2)
    .attr("height", photoRadius * 2)
    .attr("href", photoUrl)
    .style("clip-path", "circle(50%)");

  if (artist.length == 1) {
    const maxWidth = rectWidth - photoRadius * 2 - 60;
    const artistName = artist[0].artist;
    let truncatedName = artistName;
    const tempText = group
      .append("text")
      .style("font-size", "20px")
      .style("visibility", "hidden")
      .text(artistName);

    while (tempText.node().getComputedTextLength() > maxWidth) {
      truncatedName = truncatedName.slice(0, -1);
      tempText.text(truncatedName + "...");
    }
    tempText.remove();

    group
      .append("text")
      .attr("x", -rectWidth / 2 + photoRadius * 2 + 40)
      .attr("y", -rectHeight / 2 + photoRadius + 25)
      .style("fill", "white")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text(truncatedName);

    const bulletPoints = [
      { label: "Age:", value: artist[0].age },
      { label: "Gender:", value: artist[0].gender },
    ];

    const typeValue =
      artist[0].type === "person" ? "Solo Artist" : artist[0].type;
    bulletPoints.push({ label: "Type:", value: typeValue });

    const cities = [artist[0].city_1, artist[0].city_2, artist[0].city_3];

    const validCities = cities.filter((city) => city !== "n/a");
    if (validCities.length > 0 && artist[0].country !== "n/a") {
      const cityCountry = `${validCities[0]}, ${artist[0].country}`;
      bulletPoints.push({ label: "Place of Origin:", value: cityCountry });
    }

    group
      .selectAll(".bullet-point")
      .data(bulletPoints)
      .enter()
      .append("text")
      .attr("class", "bullet-point")
      .attr("x", -rectWidth / 2 + photoRadius * 2 + 40)
      .attr("y", (d, i) => -rectHeight / 2 + photoRadius + 60 + i * textSpacing)
      .style("fill", "white")
      .style("font-size", "14px")
      .text((d) => `${d.label} ${d.value}`);
  } else {
    group
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("fill", "white")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text("No information is available");
  }
}
