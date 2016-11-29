# encode-xav-68bt
A command line ffmpeg wrapper for encoding videos in a format suitable for playback on the Sony XAV-68BT head unit.

The encoder matches input files with the file extensions `.mkv`, `.mp4` and `.webm`.

Output files are downscaled to a width of 720px, saved in the `.avi` format at 3000k video bitrate,
with MP3 audio at 192k bitrate. These encoder settings are not currently configurable.

## Installation

Install [ffmpeg](https://chocolatey.org/packages/ffmpeg) (e.g. with
`choco install ffmpeg -y` if you use [Chocolatey](https://chocolatey.org/)).

Run `npm install -g encode-xav-68bt` from a command line.

## Usage

Run `encode-xav-68bt inputDirectory outputDirectory`

The input directory and output directory are required parameters, and they must
either be specified in order as above, or using the flags described below.

### Options

| Flag        | Description  |
| ----------- | ------------ |
| -t X        | Number of threads with which to render videos in parallel (if unspecified, defaults to the number of CPU cores in the machine) |
| -i, --input, --inputDirectory "inputDirectory" | Path to a directory containing videos that should be encoded |
| -o, --output, --outputDirectory "outputDirectory" | Path to the directory where encoded files should be saved (will be created if it does not already exist) |
