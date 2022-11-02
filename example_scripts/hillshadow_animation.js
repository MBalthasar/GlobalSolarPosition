//==========================================================================//
//
// Description: Example script for computing and animating the hill shadow,
//              as well as the total solar hours per day
// Author: Marius Philipp
// Date: 2022-11-02
//  
//==========================================================================//

///// -------- \\\\\
/// Prepare data \\\
///// -------- \\\\\

// Zoom to aoi
Map.centerObject(my_aoi);

// Finding the center of the aoi
var centroid = my_aoi.centroid(1);

// Load SRTM and clip to aoi
var dem = ee.Image("USGS/SRTMGL1_003")
  .clip(my_aoi);

// Add dem to map
Map.addLayer(dem, {palette: ['grey', 'lightgreen', 'khaki', 'brown', 'white'], 
                   min:0, max:3000}, 'DEM');

// Define dates
var start_date = ee.Date('2022-08-27T05:00:00');
var end_date = ee.Date('2022-08-27T21:00:00');

// Get difference between dates in minutes
var date_diff = end_date.difference({start: start_date, unit: 'minute'});

// define number of minutes to advance
var min_step = 10;

// Create sequence of time differences
var min_seq = ee.List.sequence(0, date_diff, min_step);

// Map over list of minutes and create new date objects
var date_list = min_seq.map(function(min_diff){
  // Add current difference in minutes to start date
  var current_date = start_date.advance({delta: min_diff, unit: 'minute'});
  // Return new date
  return current_date;
});


///// ---------------------- \\\\\
/// Calculate Image collection \\\
///// ---------------------- \\\\\

// Import solar position functions
var Imported = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Position_Function');
var Imported2 = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Surface_Position_Function');


// Calculate hillshadow per date
var solar_col = ee.ImageCollection.fromImages(
    date_list.map(function(date) {
      // Get date informations
      // Get day of year, hour, minute and second as number
      var current_year = ee.Number.parse(ee.Date(date).format('y'));
      var current_doy = ee.Number.parse(ee.Date(date).format('D'));
      var current_day = ee.Number.parse(ee.Date(date).format('d'));
      var current_hour = ee.Number.parse(ee.Date(date).format('H'));
      var current_min = ee.Number.parse(ee.Date(date).format('m'));
      var current_sec = ee.Number.parse(ee.Date(date).format('s'));
      // Execute solar position function
      var current_solar_postion = Imported.solar_fun(ee.Date(date), my_aoi);
      var current_solar_surface_postion = Imported2.solar_surface_fun(ee.Date(date), my_aoi, dem);
      // Get relevant bands
      var current_zenith = current_solar_postion.select("zenith");
      var current_ele = current_solar_postion.select("ele");
      var current_azimuth = current_solar_postion.select("azimuth");
      // Extract solar zenith, elevation and azimuth for the center point of the aoi
      var zenith_value = current_zenith.reduceRegion({reducer: ee.Reducer.max(),
                                                      geometry: centroid, scale: 30})
                                                      .get('zenith');
      var ele_value = current_ele.reduceRegion({reducer: ee.Reducer.max(),
                                                geometry: centroid, scale: 30})
                                                .get('ele');
      var azimuth_value = current_azimuth.reduceRegion({reducer: ee.Reducer.max(), 
                                                        geometry: centroid, scale: 30})
                                                        .get('azimuth');
      // Caluclate hillshadow/illumination
      var hillillumination = ee.Terrain.hillShadow({image: dem,
                                                    azimuth: azimuth_value, 
                                                    zenith: zenith_value, 
                                                    neighborhoodSize: 1000});
      var hillshadow = hillillumination.eq(0);
      // Return ImageCollection add meta-information
      return hillshadow.rename('Hill Shadow')
        .addBands(hillillumination.rename('Hill Illumination'))
        .set('Date', date)
        .set('Year', current_year)
        .set('DOY', current_doy)
        .set('Day', current_day)
        .set('Hour', current_hour)
        .set('Min', current_min)
        .set('Sec', current_sec)
        .set('Elevation', ele_value);
    })
  );

// Remove all scenes with negative elevation angle
var solar_col = solar_col.filterMetadata('Elevation','not_less_than',0);


///// --------------- \\\\\
/// Calculate sun hours \\\
///// --------------- \\\\\

// get denominiator (60 / number of minutes per step)
var min_denom = 60 / min_step;

// Calculate sum and divide minute denominator
var sun_hours = solar_col.select('Hill Illumination').sum().divide(min_denom);


///// ----- \\\\\
/// Animation \\\
///// ----- \\\\\

// Define current band
var current_col = solar_col.select("Hill Shadow")
  .map(function(img){return img.selfMask()});

// Define some packages for visualisation of the video
var animation = require('users/gena/packages:animation');
var text = require('users/gena/packages:text');

// Define video
var current_col_video =  current_col.map(function(image){
  // Define date of image as label
  var label_data = image.bandNames().get(0);
  var label_hour = ee.Number(image.get('Hour')).format('%02d');
  var label_min = ee.Number(image.get('Min')).format('%02d');
  var label = ee.String(label_data).cat(ee.String(" at ")).cat(label_hour).cat(ee.String(":")).cat(label_min);
  // Output image with pre-defined bands and values
  return image.visualize({palette: ['black'], 
                          min: 0, max: 1, 
                          opacity: 0.5}).set({label: label});
});

// Define annotation properties
var annotations_properties = [{
    position: 'left', offset: '2%', margin: '2%', 
    property: 'label', scale: Map.getScale() * 2}];

// Add annotations
current_col_video = current_col_video.map(function(image) {
  return text.annotateImage(image, {}, my_aoi, annotations_properties);
});

// Map video with all images available "MODIS_annual_video.size()"
animation.animate(current_col_video, {maxFrames: current_col_video.size()});


///// --------------- \\\\\
/// Visualize Sun Hours \\\
///// --------------- \\\\\

// Define visualization properties and label of sun hours image
var sun_hours_img = sun_hours.visualize({
    forceRgbOutput: true,
    min: 6,
    max: 13.5,
    palette: ['black', 'white']
  }).set({label:'Total Solar Hours'});
print("sun_hours_img", sun_hours_img);

// Add annotation to image
var annotated = text.annotateImage(sun_hours_img, {}, my_aoi, annotations_properties);

// Visualize image
Map.addLayer(annotated);
