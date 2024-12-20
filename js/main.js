const ctx = {
    countries: [
        "Global", "Argentina", "Australia", "Austria", "Belgium", "Bolivia", "Brazil", "Bulgaria",
        "Canada", "Chile", "Colombia", "Costa Rica", "Czech Republic", "Denmark", 
        "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Finland", 
        "France", "Germany", "Greece", "Guatemala", "Honduras", "Hong Kong", 
        "Hungary", "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", 
        "Latvia", "Lithuania", "Luxembourg", "Malaysia", "Mexico", "Morocco", "Netherlands", 
        "New Zealand", "Nicaragua", "Norway", "Panama", "Paraguay", "Peru", "Philippines", 
        "Poland", "Portugal", "Romania", "Russia", "Saudi Arabia", "Singapore", "Slovakia", 
        "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", 
        "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", 
        "Uruguay", "Vietnam"
    ],
    colorPallette: [
        "#2c7fb8",  // Blue
        "#4eb3d3",  // Light Blue
        "#b2f25c",  // Pale Green
        "#ffdc1b",  // Yellow
        "#f1e303",  // Bright Yellow
        "#a1d48f",  // Light Greenish
        "#66c2a4",  // Green
        "#99d84e",  // Yellow-Green
        "#ffbf00",  // Yellow-Orange
        "#d9ed00"   // Yellow-Greenish
    ],
    attributes: [
        "af_danceability",
        "af_energy",
        "af_speechiness",
        "af_acousticness",
        "af_valence",
        "af_tempo",
    ],
    maxOptions: 10,// Maximum artists to be added
    addedArtists: new Set(),
    addedSongs: new Set(),
    artistSongs: {},
    songData: [],
    chartData: []
};


function createViz() {
    console.log("Using D3 v" + d3.version);
    updateCountrylist();
    loadSongData("../data/song_data_without_genre.csv");
};

function loadSongData(csvFilePath) {
    d3.csv(csvFilePath).then(data => {
        ctx.songData = data; // Store the entire CSV data in a global variable
        initializePlots();
    }).catch(error => {
        console.error("Error loading song data:", error);
    });
}

function updateCountrylist() {
    const countryList = d3.select("#country-list");

    // Clear existing options and add a default option
    countryList.selectAll("option").remove();
    countryList.append("option")
        .attr("value", "")
        .attr("disabled", true)
        .attr("selected", true)
        .text("Select a country");

    // Populate the select with sorted countries
    ctx.countries.forEach(country => {
        countryList.append("option")
            .attr("value", country)
            .text(country);
    });

    countryList.on("change", () => {
        const selectedCountry = countryList.node().value;
        const [startDays, endDays] = handles.data().sort(d3.ascending);

        // Use the globally declared startDate and endDate
        const startDateCurrent = new Date(startDate);
        const endDateCurrent = new Date(startDate);

        startDateCurrent.setDate(startDate.getDate() + startDays);
        endDateCurrent.setDate(startDate.getDate() + endDays);
    
        handleFilterChange(selectedCountry, startDateCurrent, endDateCurrent);
    });
}

function handleFilterChange(selectedCountry, startDate, endDate) {
    if (!selectedCountry) {
        console.warn("No country selected.");
        return;
    }

    // Load data for the selected country and date range
    loadCountryDataFiles(selectedCountry, startDate, endDate);
}

const sliderWidth = 600; // Width of the slider in pixels
const startDate = new Date(2017, 0, 1); // Jan 1, 2017
const endDate = new Date(2021, 11, 31); // Dec 31, 2023
const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // Total days in range

// Create scales
const xScale = d3.scaleLinear()
    .domain([0, totalDays])
    .range([0, sliderWidth]);

// Create the SVG slider container
const svg = d3.select("#slider")
    .append("svg")
    .attr("width", sliderWidth + 40)
    .attr("height", 50)
    .append("g")
    .attr("transform", "translate(20, 20)");

// Add a background track
svg.append("rect")
    .attr("class", "track")
    .attr("width", sliderWidth)
    .attr("height", 6)
    .attr("rx", 3)
    .style("fill", "#ccc");

// Add the range highlight
const range = svg.append("rect")
    .attr("class", "range")
    .attr("height", 6)
    .attr("rx", 3)
    .attr("y", 0)
    .attr("x", 0)
    .attr("width", sliderWidth)
    .style("fill", "#1DB954");

// Add handles
const handles = svg.selectAll(".handle")
    .data([0, totalDays]) // Initialize handles at the start and end
    .enter()
    .append("circle")
    .attr("class", "handle")
    .attr("r", 10)
    .attr("cx", (d) => xScale(d))
    .style("fill", "#199b46")
    .style("stroke", "#EEEEEE")
    .call(
        d3.drag()
            .on("drag", function (event, d) {
                const x = Math.max(0, Math.min(sliderWidth, event.x));
                const days = Math.round(xScale.invert(x));
                d3.select(this).attr("cx", x);
                d3.select(this).datum(days); // Update data for this handle
                updateRange();
            })
            .on("end", function () {
                // On drag end: load data
                const [startDays, endDays] = handles.data().sort(d3.ascending);
                const startDateCurrent = new Date(startDate);
                const endDateCurrent = new Date(startDate);

                startDateCurrent.setDate(startDate.getDate() + startDays);
                endDateCurrent.setDate(startDate.getDate() + endDays);

                // Trigger the data loading function
                const selectedCountry = d3.select("#country-list").node().value;
                handleFilterChange(selectedCountry, startDateCurrent, endDateCurrent);
            })
    );

// Update range highlight and display dates
function updateRange() {
    const [startDays, endDays] = handles.data().sort(d3.ascending);
    const startDateCurrent = new Date(startDate);
    const endDateCurrent = new Date(startDate);

    startDateCurrent.setDate(startDate.getDate() + startDays);
    endDateCurrent.setDate(startDate.getDate() + endDays);

    range
        .attr("x", xScale(startDays))
        .attr("width", xScale(endDays) - xScale(startDays));

    d3.select("#start-date").text(startDateCurrent.toISOString().split("T")[0]);
    d3.select("#end-date").text(endDateCurrent.toISOString().split("T")[0]);
}

// Initialize range
updateRange();

let isArtistDropdownInitialized = false
let isSongDropdownInitialized = false
// Handle tab switching
const tabs = document.querySelectorAll(".tab-button");
const plots = document.querySelectorAll(".plot");

tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
        // Remove active class from all tabs and plots
        tabs.forEach((t) => t.classList.remove("active"));
        plots.forEach((p) => p.classList.remove("active"));

        // Add active class to the clicked tab and corresponding plot
        this.classList.add("active");
        document.getElementById(this.dataset.tab).classList.add("active");

        // Check if the clicked tab is Artist Analysis and initialize the dropdown
        if (this.dataset.tab === "artist-analysis" && !isArtistDropdownInitialized) {
            createArtistDropdown("../data/top_artists.csv");
            isArtistDropdownInitialized = true; // Prevent re-initialization
        } else if (this.dataset.tab === "song-analysis" && !isSongDropdownInitialized){
            createSongDropdown("../data/top_5000_tracks.csv");
            isSongDropdownInitialized = true
        } else if (this.dataset.tab === "attribute-analysis"){
            updateAttributeAnalysis();
        }
    });
});

// D3.js for plotting
function initializePlots() {
    // const songAnalysis = d3.select("#song-analysis");
    // const genreAnalysis = d3.select("#genre-analysis");
    
    
    createSongDropdown("../data/top_5000_tracks.csv");
    isSongDropdownInitialized = true; // Prevent re-initialization
    
    
    // genreAnalysis.append("svg")
    //     .attr("width", "100%")
    //     .attr("height", "100%")
    //     .append("text")
    //     .attr("x", "50%")
    //     .attr("y", "50%")
    //     .attr("text-anchor", "middle")
    //     .style("fill", "#1DB954")
    //     .style("font-size", "24px")
    //     .text("Genre Analysis Chart Placeholder");

}

// // Call the function to intialization
// initializePlots();

function sanitizeClassName(name) {
    return name.replace(/[^\w-]/g, '_'); // Replace invalid characters with "_"
}


function createSongDropdown(csvFilePath) {

    const container = d3.select("#song-analysis")
        .append("div")
        .attr("class", "artist-container");

    const leftPanel = container.append("div")
        .attr("class", "artist-left-panel");

    leftPanel.append("label")
        .attr("for", "songDropdown")
        .text("Select Songs: ");

    const dropdown = leftPanel.append("select")
        .attr("id", "songDropdown")
        .attr("class", "dropdown");

    dropdown.append("option")
        .attr("value", "")
        .attr("disabled", true)
        .attr("selected", true)
        .text("Select a song...");

    const addButton = leftPanel.append("button")
        .attr("class", "addButton")
        .text("Add Song");

    const songListContainer = leftPanel.append("div")
        .attr("class", "listContainer");

    const rightPanel = container.append("div")
        .attr("class", "artist-right-panel")
        .attr("id", "song-plot");

    d3.csv(csvFilePath).then(data => {
        dropdown.selectAll("option.song-option")
            .data(data)
            .enter()
            .append("option")
            .attr("class", "song-option")
            .attr("value", d => d.track_id)
            .text(d => d.song_with_artist);

            console.log("song drop down");
    }).catch(error => {
        console.error("Error loading CSV file:", error);
    });

    function renderSongList() {
        songListContainer.html(""); // Clear existing list

        ctx.addedSongs.forEach(songKey => {
            const song = songKey.split('-').slice(1).join('-');  // Split the key into id and name
            const tag = songListContainer.append("div")
                .attr("class", "artist-tag")
                .text(song);

            tag.append("span")
                .attr("class", "remove-tag")
                .text("X")
                .on("click", () => removeSong(songKey));  // Use songKey to remove
        });

        updateButtonState();
    }

    function addSong() {
        const selectedSongId = dropdown.node().value;
        const selectedSongName = dropdown.node().options[dropdown.node().selectedIndex].text;

        if (selectedSongId && !ctx.addedSongs.has(`${selectedSongId}-${selectedSongName}`)) {
            if (ctx.addedSongs.size < ctx.maxOptions) {
                ctx.addedSongs.add(`${selectedSongId}-${selectedSongName}`);
                renderSongList();
                updateSongPlot();
            }
        }
    }

    function removeSong(songKey) {
        ctx.addedSongs.delete(songKey);  // Remove using the correct key
        renderSongList();
        updateSongPlot();
    }

    function updateButtonState() {
        if (ctx.addedSongs.size >= ctx.maxOptions) {
            addButton.attr("disabled", true).style("background-color", "#ccc");
        } else {
            addButton.attr("disabled", null).style("background-color", null);
        }
    }

    addButton.on("click", addSong);
}

function updateSongPlot() {
    console.log("ctx.addedSongs (Set):", ctx.addedSongs); // Debugging

    const addedSongsArray = Array.from(ctx.addedSongs);

    if (addedSongsArray.length === 0) {
        console.error("No songs selected in ctx.addedSongs.");
        return;
    }

    const svgWidth = 1150;
    const svgHeight = 450;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Clear existing plots
    d3.select("#song-plot").selectAll("*").remove();

    // Prepare SVG container
    const svg = d3.select("#song-plot")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define a color scale for the songs
    const colorScale = d3.scaleOrdinal()
        .domain(addedSongsArray)
        .range(ctx.colorPallette);

    // Prepare the aggregated data for each song
    const allAggregatedData = addedSongsArray.map(song => {
        const songId = song.split('-')[0];  // Remove the artist part (assuming 'song - artist' format)
        const songData = ctx.chartData.filter(d => d.track_id === songId);

        const aggregatedData = d3.rollups(
            songData,
            v => d3.min(v, d => +d.rank),  // Get the rank for each date
            d => d.date
        ).map(([date, rank]) => ({ date: new Date(date), rank, song }));

        return aggregatedData;
    }).flat();

    const xScale = d3.scaleTime()
        .domain(d3.extent(allAggregatedData, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allAggregatedData, d => d.rank)])
        .range([height, 0]);

    // Define a clip path to prevent overflow
    chart.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Group content under clip path
    const content = chart.append("g")
        .attr("clip-path", "url(#clip)");

    // X-Axis
    const xAxis = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%b %Y")));

    // X-Axis Label
    chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("fill", "white")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Time");

    // Y-Axis
    const yAxis = chart.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    // Y-Axis Label
    chart.append("text")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("fill", "white")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Rank Score");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Rank of Songs Over Time");

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.rank));

    const songGroups = d3.groups(allAggregatedData, d => d.song);

    songGroups.forEach(([song, data]) => {
        const path = content.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", colorScale(song))
            .attr("stroke-width", 2)
            .attr("class", `line-${sanitizeClassName(song)}`)
            .attr("d", line);

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", () => {
                // Add circles after the line is drawn
            const circles = content.selectAll(`.circle-${sanitizeClassName(song)}`)
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.date))
                .attr("cy", d => yScale(d.rank))
                .attr("r", 3)
                .attr("fill", colorScale(song))
                .style("opacity", 0) // Start with opacity 0
                .attr("class", `circle-${sanitizeClassName(song)}`)
                .append("title")
                .text(d => `Song: ${song.split('-').slice(1).join('-')}\nDate: ${d3.timeFormat("%b %d, %Y")(d.date)}\nRank Score: ${d.rank}`);

            // Smoothly transition circles to visible
            content.selectAll(`.circle-${sanitizeClassName(song)}`)
                .transition()
                .duration(1000)
                .ease(d3.easeLinear)
                .style("opacity", 0.8); // Transition to visible
                });      
    });

    const legendX = width + margin.left - 200; // Adjust for legend width
    const legendY = svgHeight - margin.bottom - (addedSongsArray.length * 30) - 10; // Adjust for legend height

    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    addedSongsArray.forEach((song, index) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${index * 30})`)
            .style("cursor", "pointer")
            .on("click", function () {
                const active = d3.select(this).classed("disabled");
                const lineClass = `.line-${sanitizeClassName(song)}`;
                const circleClass = `.circle-${sanitizeClassName(song)}`;
            
                d3.select(this).classed("disabled", !active);
                d3.selectAll(lineClass).style("opacity", active ? 1 : 0.1);
                d3.selectAll(circleClass).style("opacity", active ? 1 : 0.1);
            
                d3.select(this).select("text")
                    .style("fill", active ? colorScale(song) : "gray");
            });

        legendItem.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", colorScale(song));

        legendItem.append("text")
            .attr("x", 25)
            .attr("y", 15)
            .style("fill", colorScale(song))
            .style("font-size", "10px") // Reduce font size
            .style("font-family", "Arial, sans-serif")
            .text(song.split('-').slice(1).join('-'));
    });

    // Zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 5])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            const newXScale = event.transform.rescaleX(xScale); // Rescale the x-axis

            xAxis.call(d3.axisBottom(newXScale).ticks(5).tickFormat(d3.timeFormat("%b %Y")));

            content.selectAll("path")
                .attr("d", d => d3.line()
                    .x(d => newXScale(d.date))
                    .y(d => yScale(d.rank))(d));

            content.selectAll("circle")
                .attr("cx", d => newXScale(d.date));
        });

    svg.call(zoom);
}

function createArtistDropdown(csvFilePath) {

    // Parent container with flexbox layout
    const container = d3.select("#artist-analysis")
        .append("div")
        .attr("class", "artist-container");

    // Left section: Dropdown and artist list
    const leftPanel = container.append("div")
        .attr("class", "artist-left-panel");

    // Dropdown label
    leftPanel.append("label")
        .attr("for", "artistDropdown")
        .text("Select Artists: ");

    // Dropdown
    const dropdown = leftPanel.append("select")
        .attr("id", "artistDropdown")
        .attr("class", "dropdown");

    dropdown.append("option")
        .attr("value", "")
        .attr("disabled", true)
        .attr("selected", true)
        .text("Select an artist...");

    // Add button
    const addButton = leftPanel.append("button")
        .attr("class", "addButton")
        .text("Add Artist");

    // Artist list container
    const artistListContainer = leftPanel.append("div")
        .attr("class", "listContainer");

    // Right section: Placeholder for plot
    const rightPanel = container.append("div")
        .attr("class", "artist-right-panel")
        .attr("id", "artist-plot");

    // Fetch and process the CSV file
    d3.csv(csvFilePath).then(data => {
        const artistNames = data.map(d => d.Artist);

        dropdown.selectAll("option.artist-option")
            .data(artistNames)
            .enter()
            .append("option")
            .attr("class", "artist-option")
            .attr("value", d => d)
            .text(d => d);
    }).catch(error => {
        console.error("Error loading CSV file:", error);
    });

    // Function to render the artist list as tags
    function renderArtistList() {
        artistListContainer.html(""); // Clear existing list

        // Update the list dynamically
        ctx.addedArtists.forEach(artist => {
            const tag = artistListContainer.append("div")
                .attr("class", "artist-tag")
                .text(artist);

            // Add a close (remove) button
            tag.append("span")
                .attr("class", "remove-tag")
                .text("X")
                .on("click", () => removeArtist(artist));
        });

        // Update the button state
        updateButtonState();
    }

    // Function to add an artist
    function addArtist() {
        const selectedArtist = dropdown.node().value;
        if (selectedArtist && !ctx.addedArtists.has(selectedArtist)) {
            if (ctx.addedArtists.size < ctx.maxOptions) {
                ctx.addedArtists.add(selectedArtist);
                // Find song_ids for this artist
                const songIDs = ctx.songData
                    .filter(d => d.artist.toLowerCase().includes(selectedArtist.toLowerCase()))
                    .map(d => d.track_id);

                // Update global dictionary and selectedArtists
                ctx.artistSongs[selectedArtist] = songIDs;
                console.log(ctx.artistSongs)

                renderArtistList();
                updateArtistPlot(); // Call plot update function
            }
        }
    }

    // Function to remove an artist
    function removeArtist(artist) {
        ctx.addedArtists.delete(artist);
        delete ctx.artistSongs[artist];
        renderArtistList();
        updateArtistPlot(); // Update plot after removing an artist
    }

    // Update the "Add" button state
    function updateButtonState() {
        if (ctx.addedArtists.size >= ctx.maxOptions) {
            addButton.attr("disabled", true).style("background-color", "#ccc");
        } else {
            addButton.attr("disabled", null).style("background-color", null);
        }
    }  

    // Attach event listener to add button
    addButton.on("click", addArtist);
}

function updateArtistPlot() {
    console.log("ctx.addedArtists (Set):", ctx.addedArtists); // Debugging

    const addedArtistsArray = Array.from(ctx.addedArtists);

    if (addedArtistsArray.length === 0) {
        console.error("No artists selected in ctx.addedArtists.");
        return;
    }

    const svgWidth = 1150;
    const svgHeight = 450;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Clear existing plots
    d3.select("#artist-plot").selectAll("*").remove();

    // Prepare SVG container
    const svg = d3.select("#artist-plot")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleOrdinal()
        .domain(addedArtistsArray)
        .range(ctx.colorPallette);

    const allAggregatedData = addedArtistsArray.map(artist => {
        const songIds = ctx.artistSongs[artist] || [];
        const artistData = ctx.chartData.filter(d => songIds.includes(d.track_id));

        const aggregatedData = d3.rollups(
            artistData,
            v => d3.sum(v, d => +d.streams),
            d => d.date
        ).map(([date, streams]) => ({ date: new Date(date), streams, artist }));

        return aggregatedData;
    }).flat();

    const xScale = d3.scaleTime()
        .domain(d3.extent(allAggregatedData, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allAggregatedData, d => d.streams)])
        .range([height, 0]);

    // Define a clip path to prevent overflow
    chart.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Group content under clip path
    const content = chart.append("g")
        .attr("clip-path", "url(#clip)");

    // X-Axis
    const xAxis = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%b %Y")));

    // X-Axis Label
    chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("fill", "white")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Time");

    // Y-Axis
    const yAxis = chart.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${d / 1000}k`));

    // Y-Axis Label
    chart.append("text")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("fill", "white")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Total Stream Count");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Streams of Top 200 Songs by Artists");

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.streams));

    const artistGroups = d3.groups(allAggregatedData, d => d.artist);

    artistGroups.forEach(([artist, data]) => {
        const path = content.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", colorScale(artist))
            .attr("stroke-width", 2)
            .attr("class", `line-${artist.replace(/\s+/g, "")}`)
            .attr("d", line);

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", () => {

                content.selectAll(`circle-${artist.replace(/\s+/g, "")}`)
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", d => xScale(d.date))
                    .attr("cy", d => yScale(d.streams))
                    .attr("r", 3)
                    .attr("fill", colorScale(artist))
                    .style("opacity", 0)
                    .attr("class", `circle-${artist.replace(/\s+/g, "")}`)
                    .append("title")
                    .text(d => `Artist: ${artist}\nDate: ${d3.timeFormat("%b %d, %Y")(d.date)}\nStreams: ${d.streams}`);

                // Smoothly transition circles to visible
                content.selectAll(`.circle-${artist.replace(/\s+/g, "")}`)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeLinear)
                    .style("opacity", 0.8); // Transition to visible
                });        
    });


    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, ${margin.top})`);

    addedArtistsArray.forEach((artist, index) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${index * 30})`)
            .style("cursor", "pointer")
            .on("click", function () {
                const active = d3.select(this).classed("disabled");
                const lineClass = `.line-${artist.replace(/\s+/g, "")}`;
                const circleClass = `.circle-${artist.replace(/\s+/g, "")}`;

                d3.select(this).classed("disabled", !active);
                d3.selectAll(lineClass).style("opacity", active ? 1 : 0.1);
                d3.selectAll(circleClass).style("opacity", active ? 1 : 0.1);

                d3.select(this).select("text")
                    .style("fill", active ? colorScale(artist) : "gray");
            });

        legendItem.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", colorScale(artist));

        legendItem.append("text")
            .attr("x", 25)
            .attr("y", 15)
            .style("fill", colorScale(artist))
            .style("font-size", "12px") // Reduce font size
            .style("font-family", "Arial, sans-serif")
            .text(artist);
    });

    const zoom = d3.zoom()
        .scaleExtent([1, 5])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            const newXScale = event.transform.rescaleX(xScale); // Rescale the x-axis

            xAxis.call(d3.axisBottom(newXScale).ticks(5).tickFormat(d3.timeFormat("%b %Y")));

            content.selectAll("path")
                .attr("d", d => d3.line()
                    .x(d => newXScale(d.date))
                    .y(d => yScale(d.streams))(d));

            content.selectAll("circle")
                .attr("cx", d => newXScale(d.date));
        });

    svg.call(zoom);
}

function updateAttributeAnalysis() {
    // Clear previous plot
    d3.select("#attribute-analysis").selectAll("*").remove();

    const svgWidth = 1150;
    const svgHeight = 600;
    const margin = { top: 60, right: 50, bottom: 100, left: 150 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const attributes = ctx.attributes;

    // Prepare SVG container
    const svg = d3.select("#attribute-analysis")
        .append("svg")
        .attr("id", "attribute-analysis-svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Preprocessing
    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatMonth = d3.timeFormat("%b %Y");

    // Create a map for fast song data lookups
    const songDataMap = new Map(ctx.songData.map(song => [song.track_id, song]));

    // Group by month and calculate weighted averages
    const monthlyData = d3.rollups(
        ctx.chartData,
        v => {
            const rankMap = d3.rollup(
                v,
                d => d3.mean(d, d => d.rank),
                d => d.track_id
            );

            // Precompute weighted averages
            const attributeAverages = attributes.map(attr => {
                let weightedSum = 0;
                let totalWeight = 0;

                rankMap.forEach((meanRank, trackId) => {
                    const song = songDataMap.get(trackId);
                    if (!song) return;

                    const weight = 201 - meanRank;
                    weightedSum += weight * song[attr];
                    totalWeight += weight;
                });

                return weightedSum / (totalWeight || 1); // Avoid division by zero
            });

            return Object.fromEntries(attributes.map((attr, i) => [attr, attributeAverages[i]]));
        },
        d => formatMonth(parseDate(d.date))
    );

    // Calculate min and max for normalization
    const attributeRanges = attributes.map(attr => {
        const values = monthlyData.map(([, values]) => values[attr]);
        return { attr, min: d3.min(values), max: d3.max(values) };
    });

    // Normalize data
    const normalizedData = monthlyData.map(([month, values]) => {
        const normalizedValues = attributes.reduce((obj, attr) => {
            const { min, max } = attributeRanges.find(r => r.attr === attr);
            obj[attr] = (values[attr] - min) / (max - min || 1); // Avoid division by zero
            return obj;
        }, {});
        return [month, normalizedValues];
    });

    const months = normalizedData.map(([month]) => month);

    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

    const xScale = d3.scaleBand()
        .domain(months)
        .range([0, width])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(attributes)
        .range([0, height])
        .padding(0.05);

    // X-Axis
    chart.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)")
        .style("font-size", "12px")
        .attr("fill", "white");

    // Y-Axis
    chart.append("g")
        .call(d3.axisLeft(yScale).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .attr("fill", "white");

    // Heatmap cells
    const cellData = normalizedData.flatMap(([month, values]) =>
        attributes.map(attr => ({
            month,
            attribute: attr,
            value: values[attr],
        }))
    );

    chart.selectAll("rect")
        .data(cellData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScale(d.attribute))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.value))
        .append("title") // Tooltip
        .text(d => `Month: ${d.month}\nAttribute: ${d.attribute}\nValue: ${d.value.toFixed(2)}`);

    // Add color legend
    const legendWidth = 300;
    const legendHeight = 20;

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left + width / 2 - legendWidth / 2}, ${svgHeight - 50})`);

    const legendScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    const gradientId = "heatmap-gradient";
    svg.append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .selectAll("stop")
        .data(d3.range(0, 1.1, 0.1).map(t => ({
            offset: `${t * 100}%`,
            color: colorScale(t),
        })))
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${gradientId})`);

    legend.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .attr("fill", "white");

    // Title
    svg.append("text")
        .attr("x", svgWidth / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Monthly Attribute Analysis (Normalized)");
}



function loadCountryDataFiles(country, startDate, endDate) {
    const filesToLoad = [];

    // Create a copy of the start date to iterate through the months
    const currentDate = new Date(startDate);
    currentDate.setDate(1); // Set to the first day of the current month

    // Loop through each month in the range until we exceed the end date
    while (currentDate <= endDate) {
        // Generate the file name for the current month
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Zero-padded month
        const fileName = `../data/chartData/${country}_${year}-${month}.csv`;
        filesToLoad.push(fileName);

        // Move to the next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log("Files to Load:", filesToLoad);

    // Load each file (example using d3.csv)
    Promise.all(
        filesToLoad.map(file =>
            d3.csv(file).catch(error => {
                console.error(`Error loading file ${file}:`, error);
                return null; // Handle missing or error files gracefully
            })
        )
    ).then(dataArrays => {
        // Combine or process the data as needed
        const combinedData = dataArrays.filter(data => data !== null).flat(); ;
        console.log("Loaded Data:", combinedData);

        ctx.chartData = combinedData;
        updateSongPlot();
        updateAttributeAnalysis();
        updateArtistPlot();
    });
}
