import crypto from 'crypto';

export function randomBytesBase64Async(size: number): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		crypto.randomBytes(size, (err: any, buff: Buffer) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(buff.toString('base64'));
		});
	});
}
