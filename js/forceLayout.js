/*
 * ForceLayout - Object constructor function
 * @param _parentElement -- the HTML element in which to draw the visualization
 * @param _words -- the data used to draw the visualization
 * @param _colors -- the colors used to draw the visualization
 */

ForceLayout = function (_parentElement, _words, _colors) {
	this.parentElement = _parentElement;
	this.words = _words;
	this.colorScale = _colors;
	this.circleScale;

	this.story = "all";
	this.filteredWords = [];
	this.comparisonData = [];

	this.initVis();
};

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

ForceLayout.prototype.initVis = function () {
	var vis = this;
	vis.margin = { top: 0, right: 0, bottom: 0, left: 0 };
	vis.width = 750 - vis.margin.left - vis.margin.right;
	vis.height = 475 - vis.margin.top - vis.margin.bottom;

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
	vis.circleScale = d3.scaleSqrt();

	vis.xScale = d3.scaleLinear().domain([1.3, -1.3]).range([0, vis.width]);

	vis.wrangleData();
};

/*
 * Data wrangling
 */

ForceLayout.prototype.wrangleData = function () {
	var vis = this;

	vis.filteredWords = vis.words;

	if (vis.story != "all") {
		vis.filteredWords = vis.words.filter((d) => d.story == vis.story);
	}

	vis.comparisonData = [];
	vis.filteredWords.forEach((word) => {
		if (
			!vis.comparisonData.some(
				(existingWord) =>
					existingWord.word === word.word &&
					existingWord.partOfSpeech === word.partOfSpeech
			)
		) {
			vis.comparisonData.push({
				word: word.word,
				partOfSpeech: word.partOfSpeech,
				maleCount: 0,
				neutralCount: 0,
				femaleCount: 0,
			});
		}
		let existingWord = vis.comparisonData.filter(
			(existingWord) =>
				existingWord.word === word.word &&
				existingWord.partOfSpeech === word.partOfSpeech
		)[0];
		if (word.gender == "male") {
			existingWord.maleCount += word.count;
		} else if (word.gender == "neutral") {
			existingWord.neutralCount += word.count;
		} else if (word.gender == "female") {
			existingWord.femaleCount += word.count;
		}
	});

	vis.comparisonData.forEach((word) => {
		word.percentMale =
			word.maleCount / (word.maleCount + word.neutralCount + word.femaleCount);
		word.percentNeutral =
			word.neutralCount /
			(word.maleCount + word.neutralCount + word.femaleCount);
		word.percentFemale =
			word.femaleCount /
			(word.maleCount + word.neutralCount + word.femaleCount);
	});

	vis.comparisonData.sort(
		(a, b) =>
			Math.abs((b.percentMale + 1 - b.percentFemale) / 2 - 0.5) -
			Math.abs((a.percentMale + 1 - a.percentFemale) / 2 - 0.5)
	);
	vis.comparisonData = vis.comparisonData.slice(0, 500);
	vis.comparisonData.sort(
		(a, b) =>
			b.maleCount +
			b.neutralCount +
			b.femaleCount -
			(a.maleCount + a.neutralCount + a.femaleCount)
	);
	vis.comparisonData = vis.comparisonData.slice(0, 250);

	// Update the visualization
	vis.updateVis();
};

/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

ForceLayout.prototype.updateVis = function () {
	var vis = this;

	if (vis.story == "all") {
		vis.circleScale
			.domain([
				d3.min(
					vis.comparisonData,
					(d) => d.maleCount + d.neutralCount + d.femaleCount
				),
				d3.max(
					vis.comparisonData,
					(d) => d.maleCount + d.neutralCount + d.femaleCount
				),
			])
			.range([4, 60]);
		// Force layout setup adapted from Peter Cook (2019). Force Layout. D3 in Depth. Retrieved Nov. 3, 2020 from https://www.d3indepth.com/force-layout/
		vis.simulation = d3
			.forceSimulation(vis.comparisonData)
			.force("charge", d3.forceManyBody().strength(-10))
			.force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
			.force(
				"x",
				d3.forceX().x(function (d) {
					return vis.xScale((d.percentMale + 1 - d.percentFemale) / 2);
				})
			)
			.force("y", d3.forceY().y(vis.height / 2))
			.force(
				"collision",
				d3.forceCollide().radius(function (d) {
					return vis.circleScale(d.maleCount + d.neutralCount + d.femaleCount);
				})
			)
			.on("tick", ticked);
	} else {
		vis.circleScale
			.domain([
				d3.min(
					vis.comparisonData,
					(d) => d.maleCount + d.neutralCount + d.femaleCount
				),
				d3.max(
					vis.comparisonData,
					(d) => d.maleCount + d.neutralCount + d.femaleCount
				),
			])
			.range([10, 40]);
		// Force layout setup adapted from Peter Cook (2019). Force Layout. D3 in Depth. Retrieved Nov. 3, 2020 from https://www.d3indepth.com/force-layout/
		vis.simulation = d3
			.forceSimulation(vis.comparisonData)
			.force("charge", d3.forceManyBody().strength(-15))
			.force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
			.force(
				"x",
				d3.forceX().x(function (d) {
					return vis.xScale((d.percentMale + 1 - d.percentFemale) / 2);
				})
			)
			.force("y", d3.forceY().y(vis.height / 2))
			.force(
				"collision",
				d3.forceCollide().radius(function (d) {
					return vis.circleScale(d.maleCount + d.neutralCount + d.femaleCount);
				})
			)
			.on("tick", ticked);
	}

	// Force layout setup adapted from Peter Cook (2019). Force Layout. D3 in Depth. Retrieved Nov. 3, 2020 from https://www.d3indepth.com/force-layout/
	function ticked() {
		var bubbles = vis.svg.selectAll(".bubble").data(vis.comparisonData);

		bubbles
			.enter()
			.append("circle")
			.attr("r", (d) =>
				vis.circleScale(d.maleCount + d.neutralCount + d.femaleCount)
			)
			.attr("fill", (d) =>
				vis.colorScale((d.percentMale + 1 - d.percentFemale) / 2)
			)
			.attr("stroke", "grey")
			.attr("class", "bubble");

		bubbles
			.attr("r", (d) =>
				vis.circleScale(d.maleCount + d.neutralCount + d.femaleCount)
			)
			.attr("cx", (d) => d.x)
			.attr("cy", (d) => d.y)
			.attr("fill", (d) =>
				vis.colorScale((d.percentMale + 1 - d.percentFemale) / 2)
			)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseout", mouseout);

		bubbles.exit().attr("r", 1e-6).remove();
	}

	function mouseover(e) {
		d3.select(e.target).attr("stroke", "black").attr("stroke-width", 3);

		let bubble = d3.select(e.target);
		let word = bubble.data()[0].word;
		let maleCount = bubble.data()[0].maleCount;
		let neutralCount = bubble.data()[0].neutralCount;
		let femaleCount = bubble.data()[0].femaleCount;
		let malePercent = d3.format(".0%")(bubble.data()[0].percentMale);
		let neutralPercent = d3.format(".0%")(bubble.data()[0].percentNeutral);
		let femalePercent = d3.format(".0%")(bubble.data()[0].percentFemale);

		// Tooltip setup adapted from Yan Holtz (2018). Scatterplot with tooltip in d3.js. D3.js Graph Gallery. Retrieved Nov. 3, 2020 from https://www.d3-graph-gallery.com/graph/scatter_tooltip.html
		vis.tooltip
			.style("display", "table")
			.html(
				"<h3>" +
					word +
					"</h3>" +
					"<hr>" +
					"<p>" +
					maleCount +
					" male uses (" +
					malePercent +
					")</p>" +
					"<p>" +
					neutralCount +
					" gender-neutral uses (" +
					neutralPercent +
					")</p>" +
					"<p>" +
					femaleCount +
					" female uses (" +
					femalePercent +
					")</p>"
			);
	}
	function mousemove(e) {
		vis.tooltip
			.style("left", d3.pointer(e)[0] + 5 + vis.margin.left + "px")
			.style("top", d3.pointer(e)[1] + 15 + vis.margin.top + "px");
	}
	function mouseout(e) {
		// d3.selectAll(".bubble").attr("opacity", 1);
		d3.select(e.target).attr("stroke", "grey").attr("stroke-width", 1);

		vis.tooltip.style("display", "none");
	}
};
