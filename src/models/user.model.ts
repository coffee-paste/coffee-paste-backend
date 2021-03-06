import { Entity, ObjectIdColumn, Column, AfterLoad, BeforeUpdate, BeforeInsert, AfterUpdate, AfterInsert, BeforeRemove } from 'typeorm';
import * as mongodb from 'mongodb';

@Entity('users')
export class User {
	/**
	 * User unique id
	 */
	@ObjectIdColumn({ name: '_id' })
	id: string;

	/**
	 * The user logon provider unique id
	 * TODO: add index
	 */
	@Column()
	uniqueOAuthId: string;

	/**
	 * The user unique email (can be )
	 * TODO: add index
	 */
	@Column()
	email?: string;

	/**
	 * The user display name
	 */
	@Column()
	displayName?: string;

	/**
	 * The user avatar as Base64 string
	 */
	@Column()
	avatarBase64?: string;

	/**
	 * The open notes (user workspace) collection
	 */
	@Column()
	openNotes: string[];

	/**
	 * The user's tags collection
	 */
	@Column()
	tags: string[];

	/**
	 * The local storage salt encryption key.
	 * This is *NOT* a user password, it's only used to help encrypt the user notes key stored in the local storage
	 * so only one that have access to the API will be able to read the local storage.
	 * The real encryption key will never ever will be sent to the server.
	 */
	@Column()
	localStorageSalt?: string;

	/**
	 * A key that used to read the key that stored on the local storage
	 */
	@Column()
	localStorageKek?: string;

	/**
	 * An numen readable code for password version, used to detect the encryption version of each note in case of key change
	 */
	@Column()
	passwordVersionCodeName?: string;

	/**
	 * An numen readable code for certificate version, used to detect the encryption version of each note in case of certificate change
	 */
	@Column()
	certificateVersionCodeName?: string;

	constructor(uniqueOAuthId: string, email: string, displayName: string, avatarBase64: string) {
		this.email = email;
		this.displayName = displayName;
		this.avatarBase64 = avatarBase64;
		this.uniqueOAuthId = uniqueOAuthId;
		this.tags = [];
	}

	/**
	 * After any action, convert  ObjectIDs (as it stored in the DB) to strings
	 */
	@AfterLoad()
	@AfterUpdate()
	@AfterInsert()
	afterAction() {
		this.id = (this.id as unknown as mongodb.ObjectID).toHexString();
		this.openNotes =
			this.openNotes?.map((openNote) => {
				if (typeof openNote === 'string') {
					return openNote;
				}
				return (openNote as unknown as mongodb.ObjectID).toHexString();
			}) || [];
		this.tags = this.tags || [];
	}

	/**
	 * Before any action convert the  open notes string to collection to ObjectIDs collection
	 */
	@BeforeInsert()
	beforeAction() {
		this.openNotes = this.toOpenNoteObjectIDs() as any[];
	}

	/**
	 * Before any data modify make sure to convert id to ObjectID as it stored in the DB
	 */
	@BeforeUpdate()
	@BeforeRemove()
	beforeUpdate() {
		this.id = new mongodb.ObjectID(this.id) as any;
		this.beforeAction();
	}

	/**
	 * Get the @see this.openNotes as ObjectID collection.
	 * Used to convert it before sending it to the DB driver
	 * @returns The @see this.openNotes as ObjectID collection
	 */
	public toOpenNoteObjectIDs(): mongodb.ObjectID[] {
		return this.openNotes?.map((openNote) => new mongodb.ObjectID(openNote)) || [];
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
