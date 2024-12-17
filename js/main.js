const ctx = {};


function createViz() {
    console.log("Using D3 v" + d3.version);
};

const sliderWidth = 600; // Width of the slider in pixels
const startDate = new Date(2017, 0, 1); // Jan 1, 2017
const endDate = new Date(2023, 11, 31); // Dec 31, 2023
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
    .call(
        d3.drag()
            .on("drag", function (event, d) {
                const x = Math.max(0, Math.min(sliderWidth, event.x));
                const days = Math.round(xScale.invert(x));
                d3.select(this).attr("cx", x);
                d3.select(this).datum(days); // Update data for this handle
                updateRange();
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
    });
});

// D3.js for plotting
function createDummyPlots() {
    const songAnalysis = d3.select("#song-analysis");
    const genreAnalysis = d3.select("#genre-analysis");
    const artistAnalysis = d3.select("#artist-analysis");

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

    artistAnalysis.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .style("fill", "#1DB954")
        .style("font-size", "24px")
        .text("Artist Analysis Chart Placeholder");
}

// Call the function to create dummy plots
createDummyPlots();
