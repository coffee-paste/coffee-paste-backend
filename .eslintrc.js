module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'prettier',
	],
	extends: [
		'airbnb-typescript',
		"prettier"
	],
	"env": {
		"es6": true,
		"node": true
	},
	parserOptions: {
		project: './tsconfig.json'
	},
	rules: {
		"prettier/prettier": "error",
		"import/prefer-default-export": "off",
		"arrow-body-style": "off",
		"class-methods-use-this": "off",
		"no-restricted-syntax": "off",
		"react/static-property-placement": "off",
		"no-continue": "off"
	}
};
