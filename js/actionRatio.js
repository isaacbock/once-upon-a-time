

/*
 * ActionRatio - Object constructor function
 * @param _parentElement -- the HTML element in which to draw the visualization
 * @param _words -- the data used to draw the visualization
 * @param _colors -- the colors used to draw the visualization
 */

ActionRatio = function(_parentElement, _words, _colors){
	this.parentElement = _parentElement;
    this.words = _words;
    this.colorScale = _colors;

    this.story = "all";
    this.filteredWords = [];
    this.maleCount = 0;
    this.neutralCount = 0;
    this.femaleCount = 0;
    this.malePercentage = 0;
    this.neutralPercentage = 0;
    this.femalePercentage = 0;
    this.cumulativePercentages = [];

    this.initVis();
}



/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ActionRatio.prototype.initVis = function(){
    var vis = this;
	vis.margin = {top: 0, right: 10, bottom: 0, left: 0};
	vis.width = 375 - vis.margin.left - vis.margin.right;
    vis.height = 125 - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Tooltip setup adapted from Yan Holtz (2018). Scatterplot with tooltip in d3.js. D3.js Graph Gallery. Retrieved Nov. 3, 2020 from https://www.d3-graph-gallery.com/graph/scatter_tooltip.html
    vis.tooltip = d3.select("#" + vis.parentElement)
        .append("div")
        .attr("class", "tooltip")
        .style("display", "none");

    // Scale
    vis.xScale = d3.scaleLinear()
        .domain([0,1])
        .range([0, vis.width]);

    vis.svg.append("g")
        .attr("class", "x-axis axis")
        .attr("transform", "translate(0," + (vis.height/2) + ")")
        .append("text")
            .text("Action (verbs)")
            .attr("fill", "black")
            .attr("font-size", 20)
            .attr("transform", "translate("+ (vis.width/2) +",-30)")
            .attr("text-anchor", "middle");
    
    vis.wrangleData();
}



/*
 * Data wrangling
 */

ActionRatio.prototype.wrangleData = function(){
    var vis = this;
    
    vis.filteredWords = vis.words;

    if (vis.story != "all") {
        vis.filteredWords = vis.words.filter(d => d.story == vis.story);
    }

    vis.maleCount = 0;
    vis.neutralCount = 0;
    vis.femaleCount = 0;

    vis.filteredWords.forEach( word => {
        if (word.partOfSpeech == "verb") {
            if (word.gender == "male") {
                vis.maleCount += word.count;
            }
            else if (word.gender == "neutral") {
                vis.neutralCount += word.count;
            }
            else if (word.gender == "female") {
                vis.femaleCount += word.count;
            }
        }
    });

    vis.malePercentage = vis.maleCount / (vis.maleCount + vis.neutralCount + vis.femaleCount);
    vis.neutralPercentage = vis.neutralCount / (vis.maleCount + vis.neutralCount + vis.femaleCount);
    vis.femalePercentage = vis.femaleCount / (vis.maleCount + vis.neutralCount + vis.femaleCount);

    vis.cumulativePercentages = [
        {startingPoint: 0, width: vis.malePercentage},
        {startingPoint: vis.malePercentage, width: vis.neutralPercentage},
        {startingPoint: vis.malePercentage+vis.neutralPercentage, width: vis.femalePercentage}
    ];

    vis.countData = [
        {gender: "male", count: vis.maleCount, percentage: vis.malePercentage},
        {gender: "neutral", count: vis.neutralCount, percentage: vis.neutralPercentage},
        {gender: "female", count: vis.femaleCount, percentage: vis.femalePercentage}
    ];

    // Update the visualization
    vis.updateVis();
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

ActionRatio.prototype.updateVis = function(){
    var vis = this;

	

    // plot ActionRatio
    let ratioBars = vis.svg.selectAll(".ratio.action")
        .data(vis.cumulativePercentages);
    // plot percentage labels
    let percentages = vis.svg.selectAll(".percentageLabel")
        .data(vis.countData);

    let barHeight = 30;
    let classes = ["male", "neutral", "female"];

    // enter
    ratioBars.enter().append("rect")
        .attr("class", "ratio action")
        .style("fill", (d, i) => vis.colorScale(i))
        .attr("x", d => vis.xScale(d.startingPoint))
        .attr("width", d => vis.xScale(d.width))
        .attr("y", vis.height/2 - barHeight/2)
        .attr("height", barHeight)
        .attr("class", (d,i) => classes[i])
        .classed("ratio action", true)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);
    percentages.enter().append("text")
        .text(d => {
            let malePercentage = vis.countData[0].percentage;
            let neutralPercentage = vis.countData[1].percentage;
            let femalePercentage = vis.countData[2].percentage;
            if (d.gender=="male") {
                return d3.format(".0%")(malePercentage) + " male";
            }
            if (d.gender=="neutral") {
                return d3.format(".0%")(neutralPercentage) + " neutral";
            }
            if (d.gender=="female") {
                return d3.format(".0%")(femalePercentage) + " female";
            }
        })
        .attr("y", vis.height/2 + barHeight)
        .attr("fill", d => {
            if (d.gender=="male") {
                return vis.colorScale.range()[0];
            }
            if (d.gender=="neutral") {
                return vis.colorScale.range()[1];
            }
            if (d.gender=="female") {
                return vis.colorScale.range()[2];
            }
        })
        .attr("x", d => {
            if (d.gender=="male") {
                return 0;
            }
            if (d.gender=="neutral") {
                return vis.width/2;
            }
            if (d.gender=="female") {
                return vis.width;
            }
        })
        .attr("text-anchor", d => {
            if (d.gender=="male") {
                return "start";
            }
            if (d.gender=="neutral") {
                return "middle";
            }
            if (d.gender=="female") {
                return "end";
            }
        })
        .attr("class", d => "percentageLabel " + d.gender)
        .attr("alignment-baseline", "middle")
        .attr("font-weight", "bold");
    
    // update
    ratioBars
        .transition()
        .duration(750)
        .attr("x", d => vis.xScale(d.startingPoint))
        .attr("width", d => vis.xScale(d.width));
    percentages
        .text(d => {
            let malePercentage = vis.countData[0].percentage;
            let neutralPercentage = vis.countData[1].percentage;
            let femalePercentage = vis.countData[2].percentage;
            if (d.gender=="male") {
                return d3.format(".0%")(malePercentage) + " male";
            }
            if (d.gender=="neutral") {
                return d3.format(".0%")(neutralPercentage) + " neutral";
            }
            if (d.gender=="female") {
                return d3.format(".0%")(femalePercentage) + " female";
            }
        });

    // exit
    ratioBars.exit().remove();
    percentages.exit().remove();

    function mouseover(e) {
        d3.selectAll(".male, .neutral, .female").attr("opacity", 0.5);

        vis.tooltip
            .style("display", "table");
        if (e.target.classList.contains("male")) {
            d3.selectAll(".male").attr("opacity", 1);
            let count = d3.format(",")(vis.countData.filter(gender => gender.gender == "male")[0].count);
            // Tooltip setup adapted from Yan Holtz (2018). Scatterplot with tooltip in d3.js. D3.js Graph Gallery. Retrieved Nov. 3, 2020 from https://www.d3-graph-gallery.com/graph/scatter_tooltip.html
            vis.tooltip
                .html(
                    "<h3>"+count+" male actions"+"</h3>"
                );
        }
        else if (e.target.classList.contains("neutral")) {
            d3.selectAll(".neutral").attr("opacity", 1);
            let count = d3.format(",")(vis.countData.filter(gender => gender.gender == "neutral")[0].count);
            vis.tooltip
                .html(
                    "<h3>"+count+" gender-neutral actions"+"</h3>"
                );
        }
        else if (e.target.classList.contains("female")) {
            d3.selectAll(".female").attr("opacity", 1);
            let count = d3.format(",")(vis.countData.filter(gender => gender.gender == "female")[0].count);
            vis.tooltip
                .html(
                    "<h3>"+count+" female actions"+"</h3>"
                );
        }
    }
    function mousemove(e) {
        vis.tooltip
            .style("left", (d3.pointer(e)[0]+5) + vis.margin.left + "px")
            .style("top", (d3.pointer(e)[1]+15) + vis.margin.top + "px");
    }
    function mouseout(e){
        d3.selectAll(".male, .neutral, .female").attr("opacity", 1);

        vis.tooltip
            .style("display", "none");
    }

}