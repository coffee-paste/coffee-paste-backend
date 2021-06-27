import { CollectionOperators, MatchOperators, RelationOperators } from '../core';

// Copied from https://www.npmjs.com/package/escape-string-regexp
export function escapeStringRegexp(text: string) {
	if (typeof text !== 'string') {
		throw new TypeError('Expected a string');
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}

export function relationOperatorToMongoOperator(relationOperator: RelationOperators): string {
	switch (relationOperator) {
		case 'greater':
			return '$gt';
		case 'greaterOrEquals':
			return '$gte';
		case 'less':
			return '$lt';
		case 'lessOrEquals':
			return '$lte';
		case 'notEquals':
			return '$ne';
		case 'equals':
		default:
			return '$eq';
	}
}

export function collectionOperatorsToMongoOperator(collectionOptions: CollectionOperators): string {
	switch (collectionOptions) {
		case 'notInCollection':
			return '$nin';
		case 'inCollection':
		default:
			return '$in';
	}
}

export function matchOperatorToMongoExpression(matchOperator: MatchOperators, value: string): { $regex: string; $options: string } | { [key: string]: string } {
	// If using expression, make sure to escape optional expression from the user input
	const escapedString = escapeStringRegexp(value);
	let expression;
	switch (matchOperator) {
		case 'notContains':
			expression = `^((?!${escapedString}).)*$`;
			break;
		case 'startWith':
			expression = `^${escapedString}`;
			break;
		case 'endWith':
			expression = `${escapedString}$`;
			break;
		case 'notEquals':
			return { [relationOperatorToMongoOperator('notEquals')]: value } as { [key: string]: string };
		case 'equals':
			return { [relationOperatorToMongoOperator('equals')]: value } as { [key: string]: string };
		case 'contains':
		default:
			expression = `${escapedString}`;
			break;
	}
	return {
		$regex: expression,
		$options: 'i', // Off case sensitivity // TODO make sure it works with multiline etc.
	};
}
