// Will be used to the save data
let stories = [];
let sentences = [];
let genderedLanguage = [];
let genderedAssociations = [];

// Set ordinal color scale
let colorScale = d3.scaleOrdinal();
let gradientColorScale = d3.scaleLinear();

// Variables for the visualization instances
let storySelector;
let streamgraph;
let actionRatio;
let descriptionRatio;
let forceLayout;

// Tooltips
let sources;
let streamgraphHelp;
let ratiosHelp;
let forceLayoutHelp;
let sourcesTooltip;
let streamgraphTooltip;
let ratiosTooltip;
let forceLayoutTooltip;

// Start application by loading the data
loadData();

function loadData() {
	d3.csv("data/stories.csv").then((data) => {
		stories = data;

		// Split each story into individual sentences
		stories.forEach((story) => {
			story.maleCount = 0;
			story.femaleCount = 0;
			story.neutralCount = 0;
			// Story to sentence regex adapted from Antonín Slejška (2015). Split string into sentences in javascript. Stack Overflow. Retrieved Nov. 3, 2020 from https://stackoverflow.com/a/31430385
			let storySentences = story.story
				.replace(/(\.+|\:|\!|\?)(\"*|\'*|\)*|}*|]*)/gm, "$1$2|")
				.split("|");
			storySentences.forEach((sentence, index) => {
				story.length = storySentences.length;
				// Convert to lowercase and remove all punctuation
				// Punctuation stripping regex adapted from '01AutoMonkey' (2014). How can I strip all punctuation from a string in JavaScript using regex? Stack Overflow. Retrieved Nov. 3, 2020 from https://stackoverflow.com/a/4328722
				sentence = sentence
					.toLowerCase()
					.replace(
						/['!"#$%&\\'()\*+,\-\.\/:;<=>?@\[\\\]\^_`{|}~'"\'""\"""\“""\”"—]/g,
						""
					);
				// Create array with each individual word from every sentence
				let words = sentence.split(" ");
				sentences.push({
					story: story.title,
					sentence: sentence,
					sentenceNumber: index + 1,
					sentencePercentage: (index + 1) / storySentences.length,
					words: words,
					maleCount: 0,
					femaleCount: 0,
					neutralCount: 0,
				});
			});
		});

		let genderedPronouns = [
			{
				gender: "male",
				totalFound: 0,
				words: [
					"he",
					"him",
					"his",
					"hed",
					"hell",
					"hes",
					"king",
					"prince",
					"brother",
					"father",
					"dad",
					"son",
					"man",
					"men",
					"boy",
					"boys",
					"husband",
				],
			},
			{
				gender: "female",
				totalFound: 0,
				words: [
					"she",
					"her",
					"hers",
					"shed",
					"shell",
					"shes",
					"queen",
					"princess",
					"sister",
					"mother",
					"mom",
					"daughter",
					"woman",
					"women",
					"girl",
					"girl",
					"wife",
					"lady",
				],
			},
			{
				gender: "neutral",
				totalFound: 0,
				words: [
					"you",
					"your",
					"they",
					"them",
					"their",
					"theyd",
					"theyll",
					"theyre",
					"theyve",
					"sibling",
					"parent",
					"child",
					"people",
					"person",
				],
			},
		];

		// Nontraditional gender color scheme via Lisa Charlotte (2018). An alternative to pink & blue: Colors for gender data. Chartable. Retrieved Nov. 3, 2020 from https://blog.datawrapper.de/gendercolor/
		colorScale
			.domain(["maleCount", "neutralCount", "femaleCount"])
			.range(["#00ddb8", "#F4A261", "#8600f9"]);
		gradientColorScale
			.domain([1, 0.5, 0])
			.range(["#00ddb8", "#F4A261", "#8600f9"]);

		// For each sentence of all stories, find gendered words, increment counts, and record nearby words (within specified search distance)
		let searchDistance = 5;
		genderedPronouns.forEach((gender) => {
			sentences.forEach((sentence) => {
				let words = sentence.words;
				for (let i = 0; i < words.length; i++) {
					gender.words.forEach((pronoun) => {
						if (pronoun == words[i]) {
							gender.totalFound++;
							if (gender.gender == "male") {
								sentence.maleCount++;
								stories.filter((story) => story.title == sentence.story)[0]
									.maleCount++;
							} else if (gender.gender == "female") {
								sentence.femaleCount++;
								stories.filter((story) => story.title == sentence.story)[0]
									.femaleCount++;
							} else if (gender.gender == "neutral") {
								sentence.neutralCount++;
								stories.filter((story) => story.title == sentence.story)[0]
									.neutralCount++;
							}
							let phrase = [];
							for (let j = i - searchDistance; j <= i + searchDistance; j++) {
								if (j >= 0 && j < words.length && j != i) {
									if (words[j] != "") {
										phrase.push(words[j]);
									}
								}
							}
							genderedLanguage.push({
								story: sentence.story,
								sentenceNumber: sentence.sentenceNumber,
								wordNumber: i,
								word: pronoun,
								gender: gender.gender,
								surroundings: phrase,
							});
						}
					});
				}
			});
		});

		// Count verbs vs adjectives
		d3.json("data/wordDictionary.json").then((words) => {
			let verbs = [];
			let adjectives = [];
			words.forEach((word) => {
				if (word.partOfSpeech[0] == "verb") {
					verbs.push(word.word);
				}
				if (word.partOfSpeech[0] == "adjective") {
					adjectives.push(word.word);
				}
			});
			genderedLanguage.forEach((word) => {
				word.surroundings.forEach((surroundingWord) => {
					if (verbs.includes(surroundingWord)) {
						let simplifiedVerb = words.filter(
							(verb) => verb.word === surroundingWord
						)[0].simplifiedWord;
						if (
							!genderedAssociations.some(
								(existingWord) =>
									existingWord.story === word.story &&
									existingWord.word === simplifiedVerb &&
									existingWord.gender === word.gender &&
									existingWord.partOfSpeech === "verb"
							)
						) {
							genderedAssociations.push({
								story: word.story,
								word: simplifiedVerb,
								gender: word.gender,
								partOfSpeech: "verb",
								count: 1,
							});
						} else {
							let existingWord = genderedAssociations.filter(
								(existingWord) =>
									existingWord.story === word.story &&
									existingWord.word === simplifiedVerb &&
									existingWord.gender === word.gender &&
									existingWord.partOfSpeech === "verb"
							)[0];
							existingWord.count++;
						}
					}
					if (adjectives.includes(surroundingWord)) {
						let simplifiedAdjective = words.filter(
							(adjective) => adjective.word === surroundingWord
						)[0].simplifiedWord;
						if (
							!genderedAssociations.some(
								(existingWord) =>
									existingWord.story === word.story &&
									existingWord.word === simplifiedAdjective &&
									existingWord.gender === word.gender &&
									existingWord.partOfSpeech === "adjective"
							)
						) {
							genderedAssociations.push({
								story: word.story,
								word: simplifiedAdjective,
								gender: word.gender,
								partOfSpeech: "adjective",
								count: 1,
							});
						} else {
							let existingWord = genderedAssociations.filter(
								(existingWord) =>
									existingWord.story === word.story &&
									existingWord.word === simplifiedAdjective &&
									existingWord.gender === word.gender &&
									existingWord.partOfSpeech === "adjective"
							)[0];
							existingWord.count++;
						}
					}
				});
			});

			createVis();
		});
	});
}

function createVis() {
	d3.select("#contents").style("display", "flex");
	d3.select("#loading").style("display", "none");

	storySelector = new StorySelector(
		"story_selector",
		stories,
		gradientColorScale
	);
	streamgraph = new Streamgraph("streamgraph", sentences, colorScale);
	actionRatio = new ActionRatio(
		"action_ratio",
		genderedAssociations,
		colorScale
	);
	descriptionRatio = new DescriptionRatio(
		"description_ratio",
		genderedAssociations,
		colorScale
	);
	forceLayout = new ForceLayout(
		"force_layout",
		genderedAssociations,
		gradientColorScale
	);

	sources = d3.select("#sources");
	streamgraphHelp = d3.select("#streamgraph_help");
	ratiosHelp = d3.select("#ratios_help");
	forceLayoutHelp = d3.select("#force_layout_help");

	sourcesTooltip = d3.select("#sources_tooltip").style("display", "none");
	streamgraphTooltip = d3
		.select("#streamgraph_help_tooltip")
		.style("display", "none");
	ratiosTooltip = d3.select("#ratios_help_tooltip").style("display", "none");
	forceLayoutTooltip = d3
		.select("#force_layout_help_tooltip")
		.style("display", "none");

	sources
		.on("mouseover", mouseover)
		.on("mousemove", mousemove)
		.on("mouseout", mouseout);
	streamgraphHelp
		.on("mouseover", mouseover)
		.on("mousemove", mousemove)
		.on("mouseout", mouseout);
	ratiosHelp
		.on("mouseover", mouseover)
		.on("mousemove", mousemove)
		.on("mouseout", mouseout);
	forceLayoutHelp
		.on("mouseover", mouseover)
		.on("mousemove", mousemove)
		.on("mouseout", mouseout);
}

function changeStory(title) {
	streamgraph.story = title;
	streamgraph.wrangleData();

	actionRatio.story = title;
	actionRatio.wrangleData();

	descriptionRatio.story = title;
	descriptionRatio.wrangleData();

	forceLayout.story = title;
	forceLayout.wrangleData();
}

function mouseover(e) {
	if (e.target.id == "sources") {
		sourcesTooltip.style("display", "table");
	} else if (e.target.id == "streamgraph_help") {
		streamgraphTooltip.style("display", "table");
	} else if (e.target.id == "ratios_help") {
		ratiosTooltip.style("display", "table");
	} else if (e.target.id == "force_layout_help") {
		forceLayoutTooltip.style("display", "table");
	}
}
function mousemove(e) {
	if (e.target.id == "sources") {
		sourcesTooltip
			.style("left", d3.pointer(e)[0] + "px")
			.style("top", d3.pointer(e)[1] + "px");
	} else if (e.target.id == "streamgraph_help") {
		streamgraphTooltip
			.style("left", d3.pointer(e)[0] + "px")
			.style("top", d3.pointer(e)[1] + "px");
	} else if (e.target.id == "ratios_help") {
		ratiosTooltip
			.style("left", d3.pointer(e)[0] + "px")
			.style("top", d3.pointer(e)[1] + "px");
	} else if (e.target.id == "force_layout_help") {
		forceLayoutTooltip
			.style("left", d3.pointer(e)[0] + "px")
			.style("top", d3.pointer(e)[1] + "px");
	}
}
function mouseout(e) {
	if (e.target.id == "sources") {
		sourcesTooltip.style("display", "none");
	} else if (e.target.id == "streamgraph_help") {
		streamgraphTooltip.style("display", "none");
	} else if (e.target.id == "ratios_help") {
		ratiosTooltip.style("display", "none");
	} else if (e.target.id == "force_layout_help") {
		forceLayoutTooltip.style("display", "none");
	}
}
