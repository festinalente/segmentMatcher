#include <napi.h>
#include <string>
#include <sstream>
#include <iostream>
#include <fstream>
#include <vector>
#include "rapidxml-1.13/rapidxml.hpp"
#define _USE_MATH_DEFINES
#include <cmath>

using namespace std;
using namespace rapidxml;
using namespace Napi;

string toXyz(vector<double> xyzPoints){
  int a = 6378137;
  double e2 = 0.00669437999;

  std::stringstream xyzCoordinates;

  long unsigned int lngIt = 1;
  long unsigned int eleIt = 2;
  for(vector<double>::size_type i = 0; i != xyzPoints.size(); i+=3) {

    if(i == 0){
      xyzCoordinates  << '[';
    }

    double lat = xyzPoints[i];

    double lng = xyzPoints[lngIt];

    lngIt += 3;

    double ele = xyzPoints[eleIt];

    eleIt += 3;

    double rlat = lat / 180 * M_PI;

    double rlng = lng / 180 * M_PI;

    double slat = sin(rlat);
    double clat = cos(rlat);

    double N = a / sqrt(1 -e2 * slat * slat);

    int x = ((N + ele) * clat * cos(rlng)) + a;
    xyzCoordinates << x << ',';

    int y = ((N + ele) * clat * sin(rlng)) + a;
    xyzCoordinates << y << ',';

    int z = ((N * (1 - e2) + ele) * slat) + a;
    xyzCoordinates << z;

    if( i == xyzPoints.size()-3){
      xyzCoordinates << ']';
    }else{
      xyzCoordinates << ',';
    }
  }

    std::string toString;
    xyzCoordinates >> toString;

    return toString;
}

vector<double> extractXYZ(const char* parse){
  xml_document<> doc;
  xml_node<> * root_node = NULL;
  //Load buffer from target to parse:
  ifstream targetParse (parse);
  vector<char> buffer((istreambuf_iterator<char>(targetParse)), istreambuf_iterator<char>());
  buffer.push_back('\0');
  doc.parse<0>(&buffer[0]);
  //Find out the root node:
  root_node = doc.first_node();

  //Somewhat tediously traverse the file:
  xml_node<> * trk = root_node->first_node("trk");
  xml_node<> * seg = trk->first_node("trkseg");
  //xml_node<> * point = seg->first_node("trkpt");


  std::vector<double> xyzPoints;

  for (xml_node<> * point = seg->first_node("trkpt"); point; point = point->next_sibling()){
      //atof converts string to double
      double lat = atof(point->first_attribute("lat")->value());
      xyzPoints.push_back(lat);

      double lon = atof(point->first_attribute("lon")->value());
      xyzPoints.push_back(lon);

      double ele = (point->first_node("ele")) ? atof(point->first_node("ele")->value()) : 0;
      xyzPoints.push_back(ele);
  }

  return xyzPoints;
}

Napi::Value XML2JSON(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Provide a file path string as an argument.")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string path0 = info[0].ToString().Utf8Value();
  const char* arg0 = path0.c_str();

  vector<double> parsed = extractXYZ(arg0);
  std::string xyz = toXyz(parsed);

  Napi::String napiConversion = Napi::String::New(env, xyz);

  return napiConversion;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "XML2JSON"), Napi::Function::New(env, XML2JSON));
  return exports;
}

NODE_API_MODULE(addon, Init)
