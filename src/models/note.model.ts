import { Entity, ObjectID, ObjectIdColumn, Column, BeforeInsert, AfterLoad, BeforeUpdate, AfterInsert, BeforeRemove, AfterUpdate } from "typeorm";
import * as mongodb from "mongodb";

@Entity('notes')
export class Note {

    /**
     * Note unique id
     */
    @ObjectIdColumn({ name: '_id' })
    id: string;

    // TODO: add index 
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
    contentPlain: string;

    /**
     * The note content as HTML
     */
    @Column()
    contentHTML: string;

    constructor(userId: string) {
        this.userId = userId;
        const now = new Date().getTime();
        this.creationTime = now;
        this.lastModifiedTime = now;
        this.contentPlain = '';
        this.contentHTML = '';
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
        this.id = new mongodb.ObjectID(this.id) as any;
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
    }
}