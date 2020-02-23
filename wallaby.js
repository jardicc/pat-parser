module.exports = function (wallaby) {

	return {
		files: [
			'src/**/*.ts',
			'!**/test/**/*'
		],

		tests: [
			'./test/**/*.ts'
		],
		
		env: {
			type: 'node'
		},

		testFramework: 'jest',

		
		workers: {
			initial: 7,
			regular: 5,
			restart: true
		}
	};
};