This is a *very*  crude app, I will improve it in the next few days.

How to run it:

* Navigate to the folder containing these files,
* Run node in the CLI (tested on Ubuntu only),
* Require the app:

  let gpxExt = require('./extractFromGpx');

* Add a segment (takes a GPX currently (quick hack), this could easily be built into a web
  app where a user selects like stava). Pass the file path and the option "true":

  gpxExt('./testSegment.gpx', true);

* Load a GPX and check segments:

  gpxExt('./test.gpx');

TODO:
* Tests,
* Clean up,
* Check Duplicates, duplicate names,
* Docs,
* Snap GPX to roadways, elevation correction...
