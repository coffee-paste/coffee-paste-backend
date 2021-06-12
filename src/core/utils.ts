import crypto from 'crypto';

export function randomBytesAsync(size: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        crypto.randomBytes(size, (err: any, buff: Buffer) => {
            if (err) {
                reject(err);
                return;
            }
            const hexString = buff.toString('hex');
            resolve(hexString);
        });
    });
}
