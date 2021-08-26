/*
 * Streamgraph - Object constructor function
 * @param _parentElement -- the HTML element in which to draw the visualization
 * @param _sentences -- the data used to draw the visualization
 * @param _colors -- the colors used to draw the visualization
 */

Streamgraph = function (_parentElement, _sentences, _colors) {
	this.parentElement = _parentElement;
	this.sentences = _sentences;
	this.colorScale = _colors;

	this.story = "all";
	this.filteredSentences = [];
	this.binSentences = [];
	this.countData = [
		{ gender: "male", count: 0 },
		{ gender: "neutral", count: 0 },
		{ gender: "female", count: 0 },
	];

	this.initVis();
};

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

Streamgraph.prototype.initVis = function () {
	var vis = this;
	vis.margin = { top: 10, right: 110, bottom: 80, left: 40 };
	vis.width = 750 - vis.margin.left - vis.margin.right;
	vis.height = 175 - vis.margin.top - vis.margin.bottom;

	// SVG drawing area
	vis.svg = d3
		.select("#" + vis.parentElement)
		.append("svg")
		.attr("width", vis.width + vis.margin.left + vis.margin.right)
		.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
		.append("g")
		.attr(
			"transform",
			"translate(" + vis.margin.left + "," + vis.margin.top + ")"
		);

	// Tooltip setup adapted from Yan Holtz (2018). Scatterplot with tooltip in d3.js. D3.js Graph Gallery. Retrieved Nov. 3, 2020 from https://www.d3-graph-gallery.com/graph/scatter_tooltip.html
	vis.tooltip = d3
		.select("#" + vis.parentElement)
		.append("div")
		.attr("class", "tooltip")
		.style("display", "none");

	// Scales
	vis.xScale = d3.scaleLinear();
	vis.yScale = d3.scaleLinear();
	vis.yAxisScale = d3.scaleLinear();

	// Axes
	vis.xAxis = d3.axisBottom().scale(vis.xScale).tickFormat(d3.format(".0%"));
	vis.yAxis = d3.axisLeft().scale(vis.yAxisScale).ticks(4, ",f");
	vis.svg
		.append("g")
		.attr("class", "x-axis axis")
		.attr("transform", "translate(0," + (vis.height + 10) + ")")
		.append("text")
		.text("plot progression ⟶")
		.attr("fill", "black")
		.attr("font-size", 20)
		.attr("transform", "translate(" + (vis.width / 2 + 30) + ",45)")
		.attr("text-anchor", "middle");
	vis.svg
		.append("g")
		.attr("class", "y-axis axis")
		.attr("transform", "translate(-10,0)");

	vis.wrangleData();
};

/*
 * Data wrangling
 */

Streamgraph.prototype.wrangleData = function () {
	var vis = this;

	vis.filteredSentences = vis.sentences;

	if (vis.story != "all") {
		vis.filteredSentences = vis.sentences.filter((d) => d.story == vis.story);
	}

	vis.countData.forEach((gender) => {
		gender.count = 0;
	});
	vis.filteredSentences.forEach((sentence) => {
		vis.countData[0].count += sentence.maleCount;
		vis.countData[1].count += sentence.neutralCount;
		vis.countData[2].count += sentence.femaleCount;
	});

	vis.binSentences = [];
	vis.binSentences.push({
		bin: 0,
		maleCount: 0,
		neutralCount: 0,
		femaleCount: 0,
	});
	let bins = 20;
	let binWidth = 1 / (bins + 1);
	let i = binWidth;
	while (i < 1) {
		let maleCount = 0;
		let neutralCount = 0;
		let femaleCount = 0;
		vis.filteredSentences.forEach((sentence) => {
			if (
				sentence.sentencePercentage > i - binWidth / 2 &&
				sentence.sentencePercentage <= i + binWidth / 2
			) {
				maleCount += sentence.maleCount;
				neutralCount += sentence.neutralCount;
				femaleCount += sentence.femaleCount;
			}
		});
		vis.binSentences.push({
			bin: i,
			maleCount: maleCount,
			neutralCount: neutralCount,
			femaleCount: femaleCount,
		});
		i += binWidth;
	}
	vis.binSentences.push({
		bin: 1,
		maleCount: 0,
		neutralCount: 0,
		femaleCount: 0,
	});

	// Update the visualization
	vis.updateVis();
};

/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

Streamgraph.prototype.updateVis = function () {
	var vis = this;

	// Scales and axes
	vis.xScale
		.domain([0, d3.max(vis.binSentences, (d) => d.bin)])
		.nice()
		.range([0, vis.width]);

	vis.yScale
		.domain([
			(-1 *
				d3.max(
					vis.binSentences,
					(d) => d.maleCount + d.neutralCount + d.femaleCount
				)) /
				2,
			d3.max(
				vis.binSentences,
				(d) => d.maleCount + d.neutralCount + d.femaleCount
			) / 2,
		])
		.range([vis.height, 0]);

	vis.yAxisScale
		.domain([
			0,
			d3.max(
				vis.binSentences,
				(d) => d.maleCount + d.neutralCount + d.femaleCount
			),
		])
		.nice()
		.range([vis.height, 0]);

	// modify bin data into stack for streamgraph
	let stack = d3
		.stack()
		.offset(d3.stackOffsetSilhouette)
		.order(d3.default)
		.keys(["femaleCount", "neutralCount", "maleCount"]);
	let stackedData = stack(vis.binSentences);
	// convert data to streamgraph path areas
	let area = d3
		.area()
		.x(function (d) {
			return vis.xScale(d.data.bin);
		})
		.y0(function (d) {
			return vis.yScale(d[0]);
		})
		.y1(function (d) {
			return vis.yScale(d[1]);
		})
		.curve(d3.curveMonotoneX);

	let classes = ["female", "neutral", "male"];

	// plot streamgraph
	let layers = vis.svg.selectAll(".area").data(stackedData);
	// plot streamgraph percentage labels
	let percentages = vis.svg.selectAll(".percentageLabel").data(vis.countData);

	// enter
	layers
		.enter()
		.append("path")
		.attr("class", "area")
		.style("fill", (d) => vis.colorScale(d.key))
		.attr("d", (d) => area(d))
		.attr("class", (d, i) => classes[i])
		.classed("area", true)
		.on("mouseover", mouseover)
		.on("mousemove", mousemove)
		.on("mouseout", mouseout);
	percentages
		.enter()
		.append("text")
		.text((d) => {
			let maleCount = vis.countData[0].count;
			let neutralCount = vis.countData[1].count;
			let femaleCount = vis.countData[2].count;
			let totalCount =
				vis.countData[0].count +
				vis.countData[1].count +
				vis.countData[2].count;
			if (d.gender == "male") {
				return d3.format(".0%")(maleCount / totalCount) + " male";
			}
			if (d.gender == "neutral") {
				return d3.format(".0%")(neutralCount / totalCount) + " neutral";
			}
			if (d.gender == "female") {
				return d3.format(".0%")(femaleCount / totalCount) + " female";
			}
		})
		.attr("y", (d) => {
			if (d.gender == "male") {
				return vis.height / 2 - 25;
			}
			if (d.gender == "neutral") {
				return vis.height / 2;
			}
			if (d.gender == "female") {
				return vis.height / 2 + 25;
			}
		})
		.attr("fill", (d) => {
			if (d.gender == "male") {
				return vis.colorScale.range()[0];
			}
			if (d.gender == "neutral") {
				return vis.colorScale.range()[1];
			}
			if (d.gender == "female") {
				return vis.colorScale.range()[2];
			}
		})
		.attr("x", vis.width + 10)
		.attr("class", (d) => "percentageLabel " + d.gender)
		.attr("alignment-baseline", "middle")
		.attr("font-weight", "bold");

	// update
	layers
		.transition()
		.duration(750)
		.style("fill", (d) => vis.colorScale(d.key))
		.attr("d", (d) => area(d));
	percentages.text((d) => {
		let maleCount = vis.countData[0].count;
		let neutralCount = vis.countData[1].count;
		let femaleCount = vis.countData[2].count;
		let totalCount =
			vis.countData[0].count + vis.countData[1].count + vis.countData[2].count;
		if (d.gender == "male") {
			return d3.format(".0%")(maleCount / totalCount) + " male";
		}
		if (d.gender == "neutral") {
			return d3.format(".0%")(neutralCount / totalCount) + " neutral";
		}
		if (d.gender == "female") {
			return d3.format(".0%")(femaleCount / totalCount) + " female";
		}
	});

	// exit
	layers.exit().remove();
	percentages.exit().remove();

	function mouseover(e) {
		d3.selectAll(".male, .neutral, .female").attr("opacity", 0.5);

		vis.tooltip.style("display", "table");
		if (e.target.classList.contains("male")) {
			d3.selectAll(".male").attr("opacity", 1);
			let count = d3.format(",")(
				vis.countData.filter((gender) => gender.gender == "male")[0].count
			);
			// Tooltip setup adapted from Yan Holtz (2018). Scatterplot with tooltip in d3.js. D3.js Graph Gallery. Retrieved Nov. 3, 2020 from https://www.d3-graph-gallery.com/graph/scatter_tooltip.html
			vis.tooltip.html("<h3>" + count + " male references" + "</h3>");
		} else if (e.target.classList.contains("neutral")) {
			d3.selectAll(".neutral").attr("opacity", 1);
			let count = d3.format(",")(
				vis.countData.filter((gender) => gender.gender == "neutral")[0].count
			);
			vis.tooltip.html("<h3>" + count + " gender-neutral references" + "</h3>");
		} else if (e.target.classList.contains("female")) {
			d3.selectAll(".female").attr("opacity", 1);
			let count = d3.format(",")(
				vis.countData.filter((gender) => gender.gender == "female")[0].count
			);
			vis.tooltip.html("<h3>" + count + " female references" + "</h3>");
		}
	}
	function mousemove(e) {
		vis.tooltip
			.style("left", d3.pointer(e)[0] + 5 + vis.margin.left + "px")
			.style("top", d3.pointer(e)[1] + 15 + vis.margin.top + "px");
	}
	function mouseout(e) {
		d3.selectAll(".male, .neutral, .female").attr("opacity", 1);

		vis.tooltip.style("display", "none");
	}

	// Call axis functions with the new domain
	vis.svg.select(".x-axis").call(vis.xAxis);
	vis.svg.select(".y-axis").transition().duration(750).call(vis.yAxis);
};
