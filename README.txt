# Segment matching:

## How to run:

* Navigate to the folder containing these files,
* Run node in the CLI (tested on Ubuntu only),
* Require the app:

  let gpxExt = require('./main');

* Add a segment (takes a GPX currently (quick hack), this could easily be built into a web
  app where a user selects like stava). Pass the file path and the option "true":

  gpxExt('./testSegment.gpx', true);

* Load a GPX and check segments:

  gpxExt('./test.gpx');

## Nomenclature
* Segment: A JSON file containing an array of x,y,z points in positive space.
* GPX track: A GPX file of a track to find segments on.

## How it works
Segments are stored with a unique name (a hash typically) in the file system,
currently they are simply dumped in the segments folder, but a further implementation
would follow the structure of an R-tree. This branches are made whenever a particular
branch has 9 points, rather crudely by dividing the branch in two: A better way
would be to use hierarchical clustering. The R-tree structure is used to store
points and segment names to speed up look-ups. The fact that segments are written to JSON
means that these are written to buffer and as such are limited in size, **more on this
bellow**, there are better tools for the job.

Once a GPX track is loaded to find segments (this could easily be made interactive,
as part of a routing application), a search is conducted for each point with an
error of 25 m (radius).

TODO: Check following point to see if they provide a closer hit.

If a segment with the corresponding start point is found, the same GPX track is checked
to see if the last point also has a point closely corresponding to the end point.

If the segment does have a closely corresponding start and finish point in the
GPX track, the segment is checked against that portion of the GPX track using
a t-test.

A t-test was chosen to determine segment similarity because depending on sampling
 frequency, data will have a different length and recording error will be present
 in both data-sets, therefore we want to quantify how much like one anther the
 original segment and the corresponding section of GPX track are. A visual
 example can be seen here: [Segement matcher](https://codepen.io/tomasMetcalfe/pen/eYWEgPL)


TODO: Remove points that are vastly different from their neighbours.

## Why Node.js?
I chose Node.js because it allows, for rapid prototyping and testing in my case.
The design of the program using an R-tree to store segment start points also means that
 even with large data-sets, there is a very limited number of branches to descend.

In a production environment I would not develop my own solution as I have done
here as a technical exercise, but use a database extension such as [PostGIS](https://postgis.net/)
for this purpose. Or if I was to do this in Node.js I would implement a preexisting
 solution such as [RBush](https://github.com/mourner/rbush) by Vladimir Agafonkin.

### C++
I began implementing this in C++ and made more headway, more quickly however

## Extras

### Strava segments
To make this more fun, relevant and provide stochastic real world data I wrote a
little script to get segments from Strava.

TODO:
* Tests,
* Clean up,
* Check Duplicates, duplicate names,
* Docs,
* Snap GPX to roadways, elevation correction...
