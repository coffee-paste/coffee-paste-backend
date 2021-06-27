const { DOCS_DB_URI } = process.env;

function isMigrationCommand() {
	const command = process.argv.join(' ');
	return command.includes('migration:');
}

module.exports = {
	type: 'mongodb',
	url: DOCS_DB_URI,
	entities: ['dist/models/**/*.js'],
	synchronize: false,
	logging: false,
	reconnectTries: 12 * 60 * 2,
	reconnectInterval: 1000 * 5,
	migrations: isMigrationCommand() ? ['src/migrations/**/*.ts'] : [],
	cli: {
		entitiesDir: 'src/models',
		migrationsDir: 'src/migrations',
	},
};
