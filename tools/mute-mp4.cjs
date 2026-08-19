const fs = require('node:fs');
const path = require('node:path');

const [sourcePath, outputPath] = process.argv.slice(2);

if (!sourcePath || !outputPath) {
  console.error('Usage: node mute-mp4.cjs <source.mp4> <output.mp4>');
  process.exit(1);
}

const input = fs.readFileSync(sourcePath);
const output = Buffer.from(input);

function readBoxes(buffer, start, end) {
  const boxes = [];
  let offset = start;

  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;

    if (size === 1) {
      if (offset + 16 > end) break;
      const extendedSize = buffer.readBigUInt64BE(offset + 8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('MP4 box is too large');
      size = Number(extendedSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }

    if (size < headerSize || offset + size > end) break;
    boxes.push({ offset, size, type, headerSize, dataStart: offset + headerSize, end: offset + size });
    offset += size;
  }

  return boxes;
}

function findChild(box, type) {
  return readBoxes(input, box.dataStart, box.end).find((child) => child.type === type);
}

function trackHandler(track) {
  const mdia = findChild(track, 'mdia');
  if (!mdia) return null;
  const hdlr = findChild(mdia, 'hdlr');
  if (!hdlr || hdlr.dataStart + 12 > hdlr.end) return null;
  return input.toString('ascii', hdlr.dataStart + 8, hdlr.dataStart + 12);
}

const moov = readBoxes(input, 0, input.length).find((box) => box.type === 'moov');
if (!moov) throw new Error('No moov box found; input is not a supported MP4');

const tracks = readBoxes(input, moov.dataStart, moov.end).filter((box) => box.type === 'trak');
const audioTracks = tracks.filter((track) => trackHandler(track) === 'soun');

for (const track of audioTracks) {
  output.write('free', track.offset + 4, 4, 'ascii');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);

const remainingAudioTracks = readBoxes(output, moov.dataStart, moov.end)
  .filter((box) => box.type === 'trak')
  .filter((track) => {
    const mdia = readBoxes(output, track.dataStart, track.end).find((box) => box.type === 'mdia');
    if (!mdia) return false;
    const hdlr = readBoxes(output, mdia.dataStart, mdia.end).find((box) => box.type === 'hdlr');
    return hdlr && output.toString('ascii', hdlr.dataStart + 8, hdlr.dataStart + 12) === 'soun';
  });

if (remainingAudioTracks.length !== 0) throw new Error('Audio track removal verification failed');

console.log(JSON.stringify({
  source: sourcePath,
  output: outputPath,
  bytes: output.length,
  tracks: tracks.map((track) => trackHandler(track)),
  removedAudioTracks: audioTracks.length,
  remainingAudioTracks: remainingAudioTracks.length,
}));
