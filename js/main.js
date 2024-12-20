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
    maxArtists: 10,// Maximum artists to be added
    addedArtists: new Set(),
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
        const startDate = new Date(startDate);
        const endDate = new Date(startDate);
    
        startDate.setDate(startDate.getDate() + startDays);
        endDate.setDate(startDate.getDate() + endDays);
    
        handleFilterChange(selectedCountry, startDate, endDate);
    });
}

function handleFilterChange(selectedCountry, startDate, endDate) {
    if (!selectedCountry) {
        console.warn("No country selected.");
        return;
    }

    // Load data for the selected country and date range
    loadCountryDataFiles(selectedCountry, startDate, endDate);
    updateArtistPlot();
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
        }
    });
});

// D3.js for plotting
function createDummyPlots() {
    const songAnalysis = d3.select("#song-analysis");
    const genreAnalysis = d3.select("#genre-analysis");
    // const artistAnalysis = d3.select("#artist-analysis");

    // Example dummy plot
    songAnalysis.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .style("fill", "#1DB954")
        .style("font-size", "24px")
        .text("Song Analysis Chart Placeholder");

    genreAnalysis.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .style("fill", "#1DB954")
        .style("font-size", "24px")
        .text("Genre Analysis Chart Placeholder");

    // artistAnalysis.append("svg")
    //     .attr("width", "100%")
    //     .attr("height", "100%")
    //     .append("text")
    //     .attr("x", "50%")
    //     .attr("y", "50%")
    //     .attr("text-anchor", "middle")
    //     .style("fill", "#1DB954")
    //     .style("font-size", "24px")
    //     .text("Artist Analysis Chart Placeholder");
}

// Call the function to create dummy plots
createDummyPlots();

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
        .attr("id", "artistDropdown");

    dropdown.append("option")
        .attr("value", "")
        .attr("disabled", true)
        .attr("selected", true)
        .text("Select an artist...");

    // Add button
    const addButton = leftPanel.append("button")
        .attr("id", "addArtistButton")
        .text("Add Artist");

    // Artist list container
    const artistListContainer = leftPanel.append("div")
        .attr("id", "artistListContainer");

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
            if (ctx.addedArtists.size < ctx.maxArtists) {
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
        if (ctx.addedArtists.size >= ctx.maxArtists) {
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

    // Convert the Set to an Array
    const addedArtistsArray = Array.from(ctx.addedArtists);

    // Ensure the array is not empty
    if (addedArtistsArray.length === 0) {
        console.error("No artists selected in ctx.addedArtists.");
        return; // Stop the function if there are no artists
    }

    const svgWidth = 900; // Width of the chart
    const svgHeight = 500; // Height of the chart
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
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

    // Color scale for artists
    const colorScale = d3.scaleOrdinal()
        .domain(addedArtistsArray)
        .range(d3.schemeCategory10);

    // Aggregate data for each artist
    const allAggregatedData = addedArtistsArray.map(artist => {
        const songIds = ctx.artistSongs[artist] || [];
        const artistData = ctx.chartData.filter(d => songIds.includes(d.track_id));

        const aggregatedData = d3.rollups(
            artistData,
            v => d3.sum(v, d => +d.streams), // Sum stream counts
            d => d.date // Group by date
        ).map(([date, streams]) => ({ date: new Date(date), streams, artist }));

        return aggregatedData;
    }).flat(); // Flatten into a single array

    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(allAggregatedData, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(allAggregatedData, d => d.streams)])
        .range([height, 0]);

    // Add axes
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%b %Y")));

    chart.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    // Add line paths for each artist
    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.streams));

    const artistGroups = d3.groups(allAggregatedData, d => d.artist);

    artistGroups.forEach(([artist, data]) => {
        // Add the line with a smooth transition
        const path = chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", colorScale(artist))
            .attr("stroke-width", 2)
            .attr("d", line);

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000) // Animation duration (2 seconds)
            .ease(d3.easeLinear) // Linear easing for smooth effect
            .attr("stroke-dashoffset", 0);
    });    

    // Add the legend inside the chart area, at the top-right corner
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, ${margin.top})`); // Adjust position

    addedArtistsArray.forEach((artist, i) => {
        const legendGroup = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`); // Adjust spacing between legend items

        // Add colored rectangle for each artist
        legendGroup.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colorScale(artist)); // Use the color scale for each artist

        // Add the artist name next to the colored rectangle
        legendGroup.append("text")
            .attr("x", 20) // Position text next to the rectangle
            .attr("y", 12)
            .text(artist)
            .style("font-size", "12px")
            .attr("text-anchor", "start");
    });

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
        updateArtistPlot();
    });
}
