//==========================================================================//
//
// Description: Script for computing the the solar-surface elevation,
//              zenith, and azimuth angles for a given date and time 
//              on a global scale.
// Author: Marius Philipp
// Date: 2022-10-03
//  
//==========================================================================//

//// ------------ \\\\\
/// Import Function \\\
//// ------------ \\\\\

// Import solar position function
var Imported = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Position_Function');


///// ------------------------- \\\\\
/// Define Solar Surface Function \\\
///// ------------------------- \\\\\

// Create solar-surface position function
exports.solar_surface_fun = function(date, my_aoi, my_dem) {
  
  // Check if aoi is present
  if (my_aoi === undefined || my_aoi === null){
    var rect = ee.Geometry.Rectangle([[-179.99, -85], [179.99, 85]]);
    var my_aoi = ee.Geometry({geoJson: rect, geodesic: false});
  }
  
  ///// -------------------- \\\\\
  /// Calculate Solar Position \\\
  ///// -------------------- \\\\\
  
  // Execute solar position function
  var solar_postion = Imported.solar_fun(date, my_aoi);
  // Select zenith and azimuth
  var zenith = solar_postion.select("zenith");
  var azimuth = solar_postion.select("azimuth");
  
  ///// ---------------- \\\\\
  /// Terrain Calculations \\\
  ///// ---------------- \\\\\
  
  // Calculate slope
  var slope = ee.Terrain.slope(my_dem);
  // Calculate aspect
  var aspect = ee.Terrain.aspect(my_dem);
  
  ///// ---------------- \\\\\
  /// Solar-Surface-Zenith \\\
  ///// ---------------- \\\\\
  
  // Get north and south facing slopes
  var aspect_north_1 = aspect.lte(90);
  var aspect_north_2 = aspect.gte(270);
  var aspect_north = aspect_north_1.add(aspect_north_2);
  var aspect_south = aspect_north.eq(0);
  // Get north facing pixels value -1 and south facing slopes 1
  var aspect_adj = aspect_south.multiply(2).subtract(1);
  // Multiply north facing slope by -1
  var slope_adj = slope.multiply(aspect_adj);
  // solar-surface zenith = zenith + ajdusted slop
  var surface_zenith = zenith.add(slope_adj);
  
  ///// ------------------- \\\\\
  /// Solar-Surface Elevation \\\
  ///// ------------------- \\\\\
  
  // Solar elevation = 90 degree - zenith
  var surface_ele = ee.Image.constant(90).subtract(surface_zenith);
  
  ///// ----------------- \\\\\
  /// Solar-Surface-Azimuth \\\
  ///// ----------------- \\\\\

  // Subtract aspect from azimuth to receive solar-surface azimuth angle
  var azimuth_adj = aspect.subtract(azimuth);
  // Adjust negative solar-surface azimuth angle: 
  // Areas where aspect < solar azimuth
  // -> True adjusted azimuth = 360 + (negative solar-azimuth angle)
  // Create mask for areas with negative solar-surface azimuth
  var azimuth_adj_neg_mask = azimuth_adj.lt(0);
  // Extract pixel values for areas with negative solar-surface azimuth
  var azimuth_adj_neg_values = azimuth_adj.multiply(azimuth_adj_neg_mask);
  // Apply formula "360 + (negative azimuth angle)" for negative pixel values
  var azimuth_adj_neg_values_adj = ee.Image.constant(360)
    .multiply(azimuth_adj_neg_mask)
    .add(azimuth_adj_neg_values);
  // Set areas with negative solar-surface azimuth to 0
  var azimuth_adj_no_neg = azimuth_adj.multiply(azimuth_adj.gte(0));
  // Add adjusted negative solar-surface azimuth values
  var azimuth_adj_final = azimuth_adj_no_neg.add(azimuth_adj_neg_values_adj);
  
  ///// -------- \\\\\
  /// Output image \\\
  ///// -------- \\\\\
  
  // Select relevant bands
  var out_img = surface_zenith.rename('surface_zenith')
    .addBands(surface_ele.rename('surface_ele'))
    .addBands(azimuth_adj_final.rename('surface_azimuth'));
  
  // Return output image
  return out_img;
};
