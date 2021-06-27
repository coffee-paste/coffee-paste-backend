import Joi, { ObjectSchema } from 'joi';

export const incomingNoteUpdateSchema: ObjectSchema = Joi.object()
	.keys({
		contentText: Joi.string().allow('').required(),
		contentHTML: Joi.string().allow('').required(),
		noteId: Joi.string().not('').required(),
	})
	.required();

/**
 * Validate json by given schema
 * If fail, reject with error message.
 * Else return the object after clean.
 * @param {JoiObject} schema The Joi schema object
 * @returns The validated data
 */
export async function schemaValidator<T>(data: T, schema: ObjectSchema): Promise<T> {
	return schema.validateAsync(data, data);
}
