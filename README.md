# Segment matching:

## How to run:

* Navigate to the folder containing these files,
* Run node in the CLI (tested on Ubuntu only),
* Require the app:

  let gpxExt = require('./main');

* Add a segment (takes a GPX currently (quick hack), this could easily be built into a web
  app where a user selects like stava). Pass the file path and the option "true":

  gpxExt('./testSegment.gpx', true);

* Load a GPX track and test for segments:

  gpxExt('./test.gpx');

## Want to add segments for a given area from Strava?

  /*Require or import, n.b. You may need to add an API key,
  https://www.strava.com/settings/api these expire quickly, hence mine was
  committed, it was not done in error.*/

  let stravaSegments = require('fetchSegments.js');

  /*Where swpt is the southwest point, and nept is the north-east point of the
  area you want segments for. Large areas are divided up into small 0.05 degree
  by 0.05 areas*/
  stravaSegments(swpt, nept);

## Nomenclature
* Segment: A JSON file containing an array of x,y,z points in positive space.
* GPX track: A GPX file of a track to find segments on.

## How it works
Segments are stored with a unique name (a hash typically) in the file system,
currently they are simply dumped in the segments folder, but a further implementation
would follow the structure of an R-tree. This branches are made whenever a particular
branch has 9 points, rather crudely by dividing the branch in two: A better way
might be to use hierarchical clustering. The R-tree structure is used to store
points and segment names to speed up look-ups.

If required, a seed object for the segmentRTree file is as follows:

  {"minX":0,"minY":0,"maxX":0,"maxY":0,"branch":1,"leaves":[]}

Once a GPX track is loaded to find segments (this could easily be made interactive,
as part of a routing application), a search is conducted for each point with an
error of 25 m (radius).

TODO: Check following point to see if they provide a closer hit.

If a segment with the corresponding start point is found, the same GPX track is checked
to see if the last point also has a point closely corresponding to the end point.

If the segment does have a closely corresponding start and finish point in the
GPX track, the segment is checked against that portion of the GPX track for points
within a given distance and then trimmed to return an actual matching portion of
the track.  

## Why Node.js and C++?
I chose Node.js because it allows, for rapid prototyping and testing in my case.
The design of the program using an R-tree to store segment start points also means that
 even with large data-sets, there is a very limited number of branches to descend.

It is however *slow* so I used C++ for two of the slower functions and will write
others in C++.

In a production environment I would not develop my own solution as I have done
here as a technical exercise, but use a database extension such as [PostGIS](https://postgis.net/)
for this purpose. Or if I was to do this in Node.js I would implement a preexisting
 solution such as [RBush](https://github.com/mourner/rbush) by Vladimir Agafonkin.

##Limitations:
It does not catch errors in C++ as of now.

## TODO:
* More tests, I wrote the minimum I need.
* Test accuracy
* Check duplicates segments allow slashes in names,
* Generate docs,
* Create a simple webview graphing the track, elevation and found segments (nearly done),
* Snap GPX to roadways, elevation correction...
