#!/usr/bin/env node
/* eslint-disable no-console */

const path = require('path');
const parseArgs = require('minimist');
const shelljs = require('shelljs');
const createQueue = require('queue');
const childProcess = require('child_process');
const cpuStat = require('cpu-stat');

const args = parseArgs(process.argv.slice(2));

let [inputDirectory, outputDirectory] = args._;
inputDirectory = inputDirectory || args.inputDirectory || args.input || args.i;
outputDirectory = outputDirectory || args.outputDirectory || args.output || args.o;

const threads = parseInt(args.threads || args.t, 10) || cpuStat.totalCores() || 8;

if (!inputDirectory) {
  throw new Error('No input directory provided');
}
if (!outputDirectory) {
  throw new Error('No output directory provided');
}

shelljs.mkdir('-p', path.resolve(outputDirectory));

console.log(`Beginning encode from ${inputDirectory} to ${outputDirectory} with ${threads} threads`);

const files = shelljs
  .find(path.resolve(inputDirectory))
  .filter(file => file.match(/\.(mkv)|(mp4)|(webm)$/));

const queue = createQueue();

const createFfmpegArgs = (inputFile, outputFile) => {
  const strArgs = '-i INPUTFILE -nostats -hide_banner -loglevel error -n -threads 1 -c:v mpeg4 ' +
    '-vtag xvid -b:v 3000k -vf scale=720:-1 -c:a libmp3lame -b:a 192k OUTPUTFILE';
  const newArgs = strArgs.split(' ');
  newArgs[1] = inputFile;
  newArgs[newArgs.length - 1] = outputFile;
  return newArgs;
};

files.forEach((file) => {
  queue.push((cb) => {
    const inputFile = path.resolve(file);
    const basename = path.basename(inputFile);
    const basenameWithoutExt = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(outputDirectory, `${basenameWithoutExt}.avi`);
    if (shelljs.test('-e', outputFile)) {
      console.log(`Skipped encoding existing file ${basename}`);
      cb();
    } else {
      console.log(`Encoding file ${basename}...`);
      const shellArgs = createFfmpegArgs(inputFile, outputFile);
      const process = childProcess.spawn('ffmpeg', shellArgs);

      process.stderr.on('data', data => console.log(`${data}`));

      process.on('close', () => {
        console.log(`... Completed encoding file ${basename}`);
        cb();
      });
    }
  });
});

queue.concurrency = threads;

queue.start((err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('All done!');
});
