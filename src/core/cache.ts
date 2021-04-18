import NodeCache from 'node-cache';
import { Duration } from 'unitsnet-js';

class Cache<T> {
    private _nodeCache: NodeCache;
    constructor(ttl: Duration, checkperiod: Duration, useClones: false) {
        this._nodeCache = new NodeCache({
            useClones,
            stdTTL: ttl.Seconds,
            checkperiod: checkperiod.Seconds,
        })
    }

    public set(key: string, value: T) {
        return this._nodeCache.set(key, value);
    }

    public get(key: string): T | undefined {
        return this._nodeCache.get(key);
    }
}

export interface NotesUpdateDebounceInfo {
    debounceFunc: () => void;
    lastState: {
        contentText: string;
        contentHTML: string;
    }
}

/**
 * The notes content updates debounced awaiting for DB flush
 */
export const notesContentUpdateDebounce = new Cache<NotesUpdateDebounceInfo>(
    Duration.FromHours(1),
    Duration.FromHours(1),
    false // in order to use debounceFunc for each note, don't clone the JS object 
);



