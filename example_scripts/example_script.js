//==========================================================================//
//
// Description: Example script for computing the the solar elevation,
//              zenith, and azimuth angles for a given date and time 
//              on a global scale.
// Author: Marius Philipp
// Date: 2022-10-03
//  
//==========================================================================//

///// ------ \\\\\
/// Define DEM \\\
///// ------ \\\\\

// Load SRTM and clip to aoi
var srtm = ee.Image("USGS/SRTMGL1_003");


///// ------- \\\\\
/// Define Date \\\
///// ------- \\\\\

// Define dates
var my_date = ee.Date('2022-08-27T15:15:31');


//// ------------- \\\\\
/// Import Functions \\\
//// ------------- \\\\\

// Import functions from another script
var Imported = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Position_Function');
var Imported2 = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Surface_Position_Function');


///// ------------------ \\\\\
/// Execute Solar Position \\\
///// ------------------ \\\\\

// Execute without aoi
var solar_postion = Imported.solar_fun(my_date);
print("solar_postion", solar_postion);

Map.addLayer(solar_postion.select('ele'), {min:0, max:90}, 'Elevation');


///// ----------------- \\\\\
/// Execute Solar Surface \\\
///// ----------------- \\\\\


// Execute solar-surface function without aoi
var solar_surface_position = Imported2.solar_surface_fun(my_date, null, srtm);
print("solar_surface_position", solar_surface_position);

Map.addLayer(solar_surface_position.select('surface_ele'), {min:0, max:90}, 'Surface Elevation');

