#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const parseArgs = require('minimist');
const shelljs = require('shelljs');
const createQueue = require('queue');
const childProcess = require('child_process');
const cpuStat = require('cpu-stat');
const uuid = require('uuid');

const unlink = promisify(fs.unlink);

const isWindows = os.platform() === 'win32';
const devNull = isWindows ? 'NUL' : '/dev/null';

function spawn(...args) {
  return new Promise((resolve) => {
    const process = childProcess.spawn(...args);

    process.stderr.on('data', data => console.log(`${data}`));

    process.on('close', () => {
      resolve();
    });
  });
}

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

const createFfmpegArgs = (inputFile, outputFile, logFileId, pass = 1) => {
  const passDependentFlags = pass === 1 ? '-y -f avi' : '-n';
  const strArgs = '-i INPUTFILE -nostats -hide_banner -loglevel error -threads 1 -c:v mpeg4 ' +
    `-vtag xvid -pass ${pass} -passlogfile ${logFileId} -b:v 3000k -vf scale=720:-1 ` +
    `${passDependentFlags} -c:a libmp3lame -b:a 192k OUTPUTFILE`;
  const newArgs = strArgs.split(' ');
  newArgs[1] = inputFile;
  newArgs[newArgs.length - 1] = pass === 1 ? devNull : outputFile;
  return newArgs;
};

files.forEach((file) => {
  queue.push(async (cb) => {
    const inputFile = path.resolve(file);
    const basename = path.basename(inputFile);
    const basenameWithoutExt = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(outputDirectory, `${basenameWithoutExt}.avi`);
    if (shelljs.test('-e', outputFile)) {
      console.log(`Skipped encoding existing file ${basename}`);
      cb();
    } else {
      console.log(`Encoding file ${basename}...`);

      const id = uuid();
      const firstPass = createFfmpegArgs(inputFile, outputFile, id, 1);
      const secondPass = createFfmpegArgs(inputFile, outputFile, id, 2);

      try {
        await spawn('ffmpeg', firstPass);
        console.log(`... Completed first pass of file ${basename}`);

        await spawn('ffmpeg', secondPass);
        console.log(`... Completed encoding file ${basename}`);
      } catch (err) {
        console.error(`Encode failed for file ${basename}`, err);
      }

      try {
        await unlink(`${id}-0.log`);
      } catch (err) {
        console.error(`Unable to delete 2-pass log file for ${basename}`, err);
      }

      cb();
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
