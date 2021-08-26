/*
 * Streamgraph - Object constructor function
 * @param _parentElement -- the HTML element in which to draw the visualization
 * @param _stories -- the data used to draw the visualization
 * @param _colors -- the colors used to draw the visualization
 */

StorySelector = function (_parentElement, _stories, _colors) {
	this.parentElement = _parentElement;
	this.stories = _stories;
	this.colorScale = _colors;

	this.initVis();
};

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

StorySelector.prototype.initVis = function () {
	var vis = this;
	vis.margin = { top: 0, right: 0, bottom: 0, left: 0 };
	vis.width = 300 - vis.margin.left - vis.margin.right;
	vis.height = 850 - vis.margin.top - vis.margin.bottom;

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

	// TO-DO: (Filter, aggregate, modify data)
	vis.wrangleData();
};

/*
 * Data wrangling
 */

StorySelector.prototype.wrangleData = function () {
	var vis = this;

	vis.stories.forEach((story) => {
		story.percentMale =
			story.maleCount /
			(story.maleCount + story.neutralCount + story.femaleCount);
		story.percentFemale =
			story.femaleCount /
			(story.maleCount + story.neutralCount + story.femaleCount);
	});

	vis.stories.sort((a, b) => {
		return (
			(b.percentMale + (1 - b.percentFemale)) / 2 -
			(a.percentMale + (1 - a.percentFemale)) / 2
		);
	});

	vis.stories.unshift({ title: "All Stories" });

	// Update the visualization
	vis.updateVis();
};

/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

StorySelector.prototype.updateVis = function () {
	var vis = this;

	let stories = vis.svg.selectAll(".title").data(vis.stories);

	// Enter
	stories
		.enter()
		.append("text")
		.text((d) => d.title)
		.attr("fill", (d) =>
			vis.colorScale((d.percentMale + 1 - d.percentFemale) / 2)
		)
		.attr("y", (d, i) => i * 18 + 20)
		.attr("x", (d) => {
			if (d.title == "All Stories") {
				return 21;
			} else {
				return 0;
			}
		})
		.attr("class", "title")
		.classed("active", (d, i) => {
			if (d.title == "All Stories") {
				vis.svg
					.append("text")
					.text("📘")
					.attr("class", "bookIcon")
					.attr("y", i * 18 + 20);
				return true;
			} else {
				return false;
			}
		})
		.on("click", selectStory);

	// Exit
	stories.exit().remove();

	function selectStory(e) {
		d3.selectAll(".title").classed("active", false).attr("x", 0);
		d3.selectAll(".bookIcon").remove();

		let story = d3.select(e.target);
		story
			.classed("active", true)
			.transition()
			.duration(300)
			.ease(d3.easeBackOut)
			.attr("x", 21);

		vis.svg
			.append("text")
			.text("📘")
			.attr("class", "bookIcon")
			.attr("y", story.attr("y"));

		let title = story.data()[0].title;

		if (title != "All Stories") {
			changeStory(title);
		} else {
			changeStory("all");
		}
	}
};
