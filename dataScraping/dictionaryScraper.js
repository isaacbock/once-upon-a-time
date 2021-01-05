async function dictionaryScraper() {
    let result = [];
    // Unique word data via Design215 (2020). Wordlist Maker. Design215. Retrieved Nov. 3, 2020 from https://design215.com/toolbox/wordlist.php
    d3.csv("uniqueWords.csv").then(function(entries) {
        entries.forEach((entry, index) => {
            setTimeout(async function(){
                let googleDictionaryResult = await callDictionaryAPI(entry.word);
                if (googleDictionaryResult!="error") {
                    let word = googleDictionaryResult[0].word;
                    let partOfSpeech = [];
                    googleDictionaryResult[0].meanings.forEach(meaning => {
                        partOfSpeech.push(meaning.partOfSpeech);
                    });
                    console.log(googleDictionaryResult);
                    console.log(word, partOfSpeech);
                    result.push({word: entry.word, simplifiedWord: word, partOfSpeech: partOfSpeech});
                }
                else {
                    result.push({word: entry.word, simplifiedWord: entry.word, partOfSpeech: []});
                }
                console.log(result);
            }, index*2000); 
        });
        setTimeout(function(){
            console.log("FINAL RESULT:");
            console.log(result);
        }, entries.length*2000 + 10000); 
    });
}
// Dictionary data via '(unofficial) Google Dictionary API' (2020). Dictionary API. '(unofficial) Google Dictionary API'. Retrieved Nov. 3, 2020 from https://dictionaryapi.dev/
async function callDictionaryAPI(word) {
    let url = "https://api.dictionaryapi.dev/api/v2/entries/en/"+word;
    return fetch(url)
        .then(function(response) {
            if (response.status !== 200) {
              console.log(word + " could not be found.");
              return "error";
            }
            return response.json();
        })
        .catch(function(error) {
            console.log("Fetch error for " + word + ": " + error);
            return "error";
        });
}