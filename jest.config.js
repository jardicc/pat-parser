// jest.config.js
module.exports = {
	verbose: true,
	collectCoverage: false,
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	testRegex: "(/test/.*|(\\.|/)(test|spec))\\.(tsx?)$",
	moduleFileExtensions: ["ts", "js","json", "node"],
	moduleDirectories: ['node_modules'],

	globals: {
		'ts-jest': {
			tsConfig: "jest-tsconfig.json"
		}
	}
};