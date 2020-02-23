import { readFileSync } from "fs"
import { Buffer } from "buffer";
import { PNG, ColorType } from "pngjs"
import * as fs from "fs"

const DWORD = 4;
const WORD = 2;
const BYTE = 1;
const UUIDLength = 37;

type TColorMode = "BITMAP" | "GRAYSCALE" | "INDEXED" | "RGB" | "CMYK" | "MULTICHANNEL" | "DUOTONE" | "LAB"
type TCompressionMode = "NONE" | "PackBits"

export interface IPatternFile{
	correctMagicBytes: boolean
	numberOfPatterns:number
	version: number
	patterns: IPatternItem[]
}

export interface IPatternItem{
	version: number
	colorMode: TColorMode
	width: number
	height: number
	name: string
	uuid: string
	hasAlphaChannel:boolean
	memoryList: IVMAL
	table?: Buffer
}

export interface IVMAL{
	version: number
	left: number
	top: number
	bottom: number
	right: number
	numberOfChannels: number
	channels: IChannel[]
}


export interface IChannel{
	exists: boolean
	pixelDepth?: number
	top?: number
	left?: number
	bottom?: number
	right?: number
	compressionMode?: TCompressionMode
	rawData?:Buffer
}

interface ITempLast{
	patternItem: IPatternItem
	vma:IVMAL
	vmaOffset:number
	vmaSegmentLength:number
	channel: IChannel
	vmaSegmentEnd: number
}

export class PatParser {

	private ofs: number = 0;
	private buf: Buffer = null;
	private res: IPatternFile = {
		correctMagicBytes: null,
		numberOfPatterns: null,
		patterns: null,
		version: null
	};

	private tempLast:ITempLast = {
		patternItem: null,
		vma:null,
		vmaOffset: null,
		vmaSegmentLength: null,
		channel: null,
		vmaSegmentEnd:null
	}

	constructor() {
		
	}

	public saveImages() {
			// https://www.npmjs.com/package/pngjs
		this.res.patterns.forEach((item, patternIndex) => {

			const hasAlpha = item.hasAlphaChannel ? 1 : 0;
			let rgb = Buffer.alloc(item.width * item.height * (3 + hasAlpha));
			if (item.colorMode === "RGB") {
				const r = item.memoryList.channels[0].rawData;
				const g = item.memoryList.channels[1].rawData;
				const b = item.memoryList.channels[2].rawData;
				const alpha = item.memoryList.channels?.[3]?.rawData;
	
				for (let i = 0, j = 0, len = r.length; i < len; i++ , j += (3 + hasAlpha)) {
					rgb[j] = r[i];
					rgb[j + 1] = g[i];
					rgb[j + 2] = b[i];
					if (hasAlpha) {
						rgb[j + 3] = alpha[i]
					}
				}
					
			} else if (item.colorMode === "INDEXED") {
				// 8 bit RGB table only
				const { table } = item;
				const index = item.memoryList.channels[0].rawData;
	
				for (let k = 0, l = 0, len = index.length; k < len; k += 1, l += 3) {
					rgb[l] = table[index[k] * 3];
					rgb[l + 1] = table[index[k] * 3 + 1];
					rgb[l + 2] = table[index[k] * 3 + 2];
				}
			} else if (item.colorMode === "GRAYSCALE") {
				const gray = item.memoryList.channels[0].rawData;
				const alpha = item.memoryList.channels?.[1]?.rawData;
				for (let i = 0, j = 0, len = gray.length; i < len; i++ , j += (3 + hasAlpha)) {
					rgb[j] = gray[i];
					rgb[j + 1] = gray[i];
					rgb[j + 2] = gray[i];
					if (hasAlpha) {
						rgb[j + 3] = alpha[i]
					}
				}
			}
	
			/*const r = Buffer.alloc(rgb.length).fill(0);
			const g = Buffer.alloc(rgb.length).fill(0);
			const b = Buffer.alloc(rgb.length).fill(0);
			const a = Buffer.alloc(rgb.length).fill(0);
			for (let i = 0,j=0, len = rgb.length; i < len; i += (3 + hasAlpha),j+=3) {
				r[j] = rgb[i];
				g[j + 1] = rgb[i + 1];
				b[j + 2] = rgb[i + 2];
				if (hasAlpha) {
					a[j] = rgb[i + 3]
					a[j + 1] = rgb[i + 3]
					a[j + 2] = rgb[i + 3]
				}
			};*/
	
			const channels = {/* r, g, b, a,*/ all: rgb };
			/*if (hasAlpha) {
				channels.a = a;
			}*/
				
			for (const key in channels) {
				if (channels.hasOwnProperty(key) && channels[key]) {

					const png = new PNG({width:item.width,height:item.height});
					png.data = channels[key];
					let inputColorType: ColorType = key === "all" && item.hasAlphaChannel ? 6 : 2;
					const result = PNG.sync.write(png, { inputHasAlpha: item.hasAlphaChannel, bitDepth: 8, inputColorType: inputColorType });
					if (item.name === "Dark Wood") {
						//debugger
					}
					fs.writeFileSync("C:/exp/" + "_"+patternIndex + "_" + key + "_" + item.name + "_" + item.memoryList.channels[0]?.compressionMode + "_" + item.memoryList.channels[0]?.pixelDepth + "_" + "alpha-" + item.hasAlphaChannel + "_" + item.colorMode + "_.png", result,{encoding:"binary"});

				}
			}
				
		});
	}

	public decodeFile(buffer: Buffer):IPatternFile
	public decodeFile(filePath: string):IPatternFile
	public decodeFile(arg: string | Buffer): IPatternFile {		
		if (typeof arg === "string") {
			this.buf = readFileSync(arg);
		} else {
			this.buf = arg;			
		}
		const { res } = this;
		this.verifyMagicBytes();
		res.version = this.readUInt16(); // ?
		res.numberOfPatterns = this.readUInt32();
		res.patterns = new Array(res.numberOfPatterns);

		for (let i = 0; i < res.numberOfPatterns; i++) {
			res.patterns[i] = this.decodePatternItem();			
		}

		return res;
	}

	private verifyMagicBytes():void {
		const magic = this.buf.toString("ascii", this.ofs, this.ofs + DWORD);
		this.ofs += DWORD;
		this.res.correctMagicBytes = magic === "8BPT"
	}

	private decodePatternItem(): IPatternItem {
		const item: IPatternItem = {
			version: this.readUInt32(),
			colorMode: this.readColorMode(),
			height: this.readUInt16(),
			width: this.readUInt16(),
			name: this.readUTF16String(),
			uuid: this.readUUID(),
			memoryList: null,
			hasAlphaChannel: true
		}
		console.log(item.name);
		this.tempLast.patternItem = item;
		if (item.colorMode === "INDEXED") {
			item.table = this.readColorTable();
			item.hasAlphaChannel = false;
		}
		
		item.memoryList = this.decodeVMA();
		return item;
	}

	private decodeVMA ():IVMAL {
		const vma: IVMAL = {
			version: this.readUInt32(),
			top: null,
			left: null,
			bottom: null,
			right: null,
			numberOfChannels: null,
			channels: []
		}
		this.tempLast.vma = vma;
		const _currentOffset = this.ofs;
		const _segmentLength = this.readUInt32();
		const end =  _segmentLength + _currentOffset;
		this.tempLast.vmaSegmentEnd = end;
		
		vma.top = this.readUInt32();
		vma.left = this.readUInt32();
		vma.bottom = this.readUInt32();
		vma.right = this.readUInt32();
		vma.numberOfChannels = this.numberOfChannels(this.tempLast.patternItem.colorMode);

		
		for (let i = 0; i < vma.numberOfChannels; i++) {
			const channel = this.decodeChannel();
			if (channel?.exists) {
				vma.channels.push(channel);				
			} else {
				vma.numberOfChannels -= 1;				
				this.tempLast.patternItem.hasAlphaChannel = false;
			}
		}			
		
		this.ofs = end + DWORD; // ?
		return vma;
	}

	private decodeChannel ():IChannel  {
		const channel:IChannel = {
			exists: null,
			bottom: null,
			compressionMode: null,
			left: null,
			pixelDepth: null,
			rawData: null,
			right: null,
			top:null,
		}
		this.tempLast.channel = channel;
		
		const sub = this.buf.subarray(this.ofs, this.tempLast.vmaSegmentEnd-DWORD);
		const start = sub.indexOf(new Uint8Array([0, 0, 0, 1]));
		if (start === -1) {
			channel.exists = false;
			return channel;
		}
		this.ofs += start;
		channel.exists = this.readUInt32() !== 0;
		
		if (!channel.exists) {
			return channel
		}
		const segmentLength = this.readUInt32(); // ?
		if (segmentLength === 0) {
			return channel
		}
		
		channel.pixelDepth = this.readUInt32(); // ?
		channel.top = this.readUInt32();
		channel.left = this.readUInt32();
		channel.bottom = this.readUInt32();
		channel.right = this.readUInt32();
		this.ofs += WORD // pixel depth. Already defined above so we skip it.
		channel.compressionMode = this.readCompressionMode(); // ?

		channel.rawData = this.readRawData(segmentLength, channel.compressionMode);
		
		return channel
	}

	

	private numberOfChannels(mode: TColorMode): number{
		this.ofs += DWORD
		switch (mode) {
			case "CMYK": return (4+1);
			case "LAB":			
			case "RGB": return (3+1);
			case "GRAYSCALE": return (1 + 1);
			case "INDEXED": return 1;
		}
	}

	/**
	 * For indexed color mode only
	 */
	private readColorTable(): Buffer{
		const sub = this.buf.subarray(this.ofs, this.ofs + 256 * 3)
		this.ofs += 256 * 3;
		this.ofs += DWORD //skip that weird thing. It could possibly be reference to the transparent color since table is only RGB
		return sub;
	}

	/**
	 * Unique ID of pattern
	 * Always 37 characters
	 * No length. 
	 * 1 byte per character.
	 */
	private readUUID():string {
		const result = this.buf.toString("ascii", this.ofs, this.ofs + UUIDLength);
		this.ofs += UUIDLength;
		return result;
	}

	/**
	 * It is a lie. 1 is not a ZIP as says documentation. It is packbits. Each line packed separately.
	 * @param length 
	 * @param compressionMode 
	 */
	private readRawData(length: number, compressionMode:TCompressionMode):Buffer {
		// depth, top, left, bottom, right, depth2, compression
		const subtract = DWORD + DWORD * 4 + WORD + BYTE; //23 bytes
		const subBuf = this.buf.subarray(this.ofs, this.ofs + (length - subtract));
		
		this.ofs += (length - subtract);
		if (compressionMode === "PackBits") {
			const skip = this.tempLast.channel.bottom * 2;
			return this.decodePackBits(subBuf.subarray(skip, subBuf.length), this.tempLast.channel.right * this.tempLast.channel.bottom);
		} else if (compressionMode === "NONE") {
			return subBuf;			
		}
	}

	private decodePackBits(sourceBuffer: Buffer, len: number) {
		const targetBuffer = Buffer.alloc(len);

		for (let i = 0, w = 0, sourceLen = sourceBuffer.length; i < sourceLen;) {
			const byte = sourceBuffer.readInt8(i);
			// -128 -> skip
			if (byte === -128) {
				i++;
				continue;
			} else if (byte < 0) {
				// -1 to -127 -> one byte of data repeated (1 - byte) times
				const length = 1 - byte;
				for (let j = 0; j < length; j++) {
					targetBuffer[w] = sourceBuffer[i + 1];
					w++;
				}
				i += 2;
			} else {
				// 0 to 127 -> (1 + byte) literal bytes
				const length = 1 + byte;
				
				for (let j = 0; j < length; j++) {
					targetBuffer[w] = sourceBuffer[i + 1 + j];
					w++;
				}
				i += length + 1;
			}
		}
		return targetBuffer;
	}

	private readColorMode():TColorMode {
		const mode = this.readUInt32(); // ?
		if (mode !== 3 && mode !== 2 && mode !== 1) {
			console.error("Unsupported mode: "+mode)
		}
		switch (mode) {
			case 0: return "BITMAP";
			case 1: return "GRAYSCALE";
			case 2: return "INDEXED";
			case 3: return "RGB";
			case 4: return "CMYK";

			case 7: return "MULTICHANNEL";
			case 8: return "DUOTONE";
			case 9: return "LAB";
			default: throw console.error("Unrecognized color mode: " + mode);
		}
	}

	private readCompressionMode(): TCompressionMode {
		const mode = this.readByte(); //?
		
		switch (mode) {
			case 0: return "NONE";
			case 1: return "PackBits";
			default: throw new Error("Uknown compression method: " + mode);
		}
	}

	/**
	 * 1 byte length
	 */
	private readByte(): number {
		const value = this.buf.readInt8(this.ofs);
		this.ofs += BYTE;
		return value;
	}

	/**
	 * 2 byte length
	 */
	private readUInt16(): number {
		const value = this.buf.readUInt16BE(this.ofs);
		this.ofs += WORD;
		return value;
	}

	/**
	 * 4 byte length
	 */
	private readUInt32(): number {
		const value = this.buf.readUInt32BE(this.ofs);
		this.ofs += DWORD;
		return value;
	}

	/**
	 * 4 byte - number of characters including zero termination
	 * 2 - byte per character
	 * 2 - byte zero termination character
	 */
	private readUTF16String(): string {
		const length = (this.readUInt32()-1) * 2;
		let result = this.buf.subarray(this.ofs, this.ofs + length).swap16().toString("utf16le");
		this.ofs += length + WORD;
		return result;
	}
}