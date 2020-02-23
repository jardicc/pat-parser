import {PatParser } from "./main"

(async () => {
	console.time("job");
	const pat = new PatParser();
	pat.decodeFile("A:/PS-projects/pat-parser/test/patterns/SubtlePatterns.pat");
	await pat.saveImages();
	console.timeEnd("job");	
})();
