import { Entity, ObjectIdColumn, Column, BeforeInsert, AfterLoad, BeforeUpdate, AfterInsert, BeforeRemove, AfterUpdate } from 'typeorm';
import * as mongodb from 'mongodb';

export enum Encryption {
	None = 'NONE',
	Password = 'PASSWORD',
	Certificate = 'CERTIFICATE',
}

@Entity('notes')
export class Note {
	/**
	 * Note unique id
	 */
	@ObjectIdColumn({ name: '_id' })
	id: string;

	/**
	 * The note owner
	 */
	@Column()
	userId: string;

	/**
	 * The note name (optional)
	 */
	@Column()
	name?: string;

	/**
	 * The note creation UTC time
	 */
	@Column()
	creationTime: number;

	/**
	 * The note last update UTC time
	 */
	@Column()
	lastModifiedTime: number;

	/**
	 * The note content as plain-text
	 */
	@Column()
	contentText: string;

	/**
	 * The note content as HTML
	 */
	@Column()
	contentHTML: string;

	/**
	 * The note encryption method (as default none)
	 */
	@Column()
	encryption: Encryption;

	/**
	 * A note's integrity protection value
	 * Used to prevent unauthorized modification to cipher texts.
	 *
	 * @description An attacker who gains access to the system but not the user's encryption passwords
	 * could corrupt encrypted notes by sending invalid data.
	 *
	 * To mitigate this, when a note is initially encrypted, the FE sends an integrity value (done by FE to save BE compute/entropy)
	 *
	 * @type {string}
	 * @memberof Note
	 */
	@Column()
	guardNonce?: string;

	/**
	 * The note password encryption version code-name
	 */
	@Column()
	passwordVersionCodeName?: string;

	/**
	 * The note password encryption version code-name
	 */
	@Column()
	certificateVersionCodeName?: string;

	/**
	 * This (unique read-only) random key used to salt the note encryption (if required)
	 * So the password/certificate alone will not be en enough to decrypted note content.
	 */
	@Column()
	randomNoteSalt: string;

	/**
	 * The note tags
	 */
	@Column()
	tags: string[];

	constructor(userId: string, randomNoteSalt: string, name?: string) {
		this.userId = userId;
		this.name = name;
		const now = new Date().getTime();
		this.creationTime = now;
		this.lastModifiedTime = now;
		this.contentText = '';
		this.contentHTML = '';
		this.encryption = Encryption.None;
		this.randomNoteSalt = randomNoteSalt;
		this.tags = [];
	}

	/**
	 * Before any action convert the userId string to ObjectID
	 */
	@BeforeInsert()
	beforeAction() {
		this.userId = new mongodb.ObjectID(this.userId) as any;
	}

	/**
	 * Before any data modify make sure to convert id to ObjectID as it stored in the DB
	 */
	@BeforeUpdate()
	@BeforeRemove()
	beforeUpdate() {
		this.id = this.toObjectId() as any;
		this.beforeAction();
	}

	/**
	 * After any action, convert  ObjectIDs (as it stored in the DB) to strings
	 */
	@AfterInsert()
	@AfterUpdate()
	@AfterLoad()
	afterLoad() {
		this.id = (this.id as unknown as mongodb.ObjectID).toHexString();
		this.userId = (this.userId as unknown as mongodb.ObjectID)?.toHexString() || this.userId;
		this.tags = this.tags || [];
		this.encryption = this.encryption || Encryption.None;
	}

	/**
	 * Get the @see this.id as ObjectID.
	 * Used to convert it before sending it to the DB driver
	 * @returns The @see this.id as ObjectID
	 */
	public toObjectId(): mongodb.ObjectID {
		return new mongodb.ObjectID(this.id);
	}
}

/**
 * Select all 'public' metadata fields from 'Note'
 */
export const SelectMetaFromNote: (keyof Note)[] = [
	'id',
	'name',
	'creationTime',
	'lastModifiedTime',
	'encryption',
	'passwordVersionCodeName',
	'certificateVersionCodeName',
	'randomNoteSalt',
	'tags',
];

/**
 * Select all 'public' fields from 'Note'
 */
export const SelectStandardFromNote: (keyof Note)[] = [...SelectMetaFromNote, 'contentText', 'contentHTML'];
