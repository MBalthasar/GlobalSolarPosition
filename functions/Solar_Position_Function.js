//==========================================================================//
//
// Description: Script for computing the the solar elevation, zenith, and
//              azimuth angles for a given date and time on a global scale.
// Author: Marius Philipp
// Date: 2022-10-03
//  
//==========================================================================//

///// ------ \\\\\
/// Time Zones \\\
///// ------ \\\\\

// Import time zones
var time_zones = ee.FeatureCollection('users/mbalthasarphilipp/GlobalSolarPosition/ne_10m_time_zones_edit');

// Convert vector to raster and define data type as Uint8
var time_zones_raster = time_zones.reduceToImage({properties: ['zone'], 
                                                  reducer: ee.Reducer.first()
                                                  }).toInt8().rename("time_zone");


///// ------ \\\\\
/// Leap Years \\\
///// ------ \\\\\

// Create list of leap years until year 4000
var leap_year_list = ee.List.sequence(0, 4000, 4);


///// ------------ \\\\\
/// Define Functions \\\
///// ------------ \\\\\

// Convert radians to degrees
var rad2deg = function(img) {
  var output = img.multiply(180).divide(Math.PI);
  return output;
};

// Convert degrees to radians
var deg2rad = function(img) {
  var output = img.multiply(Math.PI).divide(180);
  return output;
};

// Fractional year (in radians)
var frac_year_fun = function(img) {
  var output = img.expression(
    "((2 * pi)/year_denom) * (doy - 1 + (((hour + (min/60) + (sec/3600)) - 12)/24))",
    {
    pi: img.select("pi"),
    year_denom: img.select("year_denom"),
    doy: img.select("doy"),
    hour: img.select("hour"),
    min: img.select("min"),
    sec: img.select("sec")
    });
  return output.rename('frac_year');
};

// Equation of time (in minutes)
var eqtime_fun = function(img) {
  var output = img.expression(
    "229.18*(0.000075 + 0.001868*cos_frac_year - 0.032077*sin_frac_year - 0.014615*cos_2frac_year - 0.040849*sin_2frac_year)",
    {
    sin_frac_year: img.select("sin_frac_year"),
    sin_2frac_year: img.select("sin_2frac_year"),
    cos_frac_year: img.select("cos_frac_year"),
    cos_2frac_year: img.select("cos_2frac_year")
    });
  return output.rename('eqtime');
};

// Solar declination angle (in radians)
var decl_fun = function(img) {
  var output = img.expression(
    "0.006918 - 0.399912*cos_frac_year + 0.070257*sin_frac_year - 0.006758*cos_2frac_year + 0.000907*sin_2frac_year - 0.002697*cos_3frac_year + 0.00148*sin_3frac_year",
    {
    sin_frac_year: img.select("sin_frac_year"),
    sin_2frac_year: img.select("sin_2frac_year"),
    sin_3frac_year: img.select("sin_3frac_year"),
    cos_frac_year: img.select("cos_frac_year"),
    cos_2frac_year: img.select("cos_2frac_year"),
    cos_3frac_year: img.select("cos_3frac_year")
    });
  return output.rename('decl');
};

// Time offset (in minutes)
var time_offset_fun = function(img) {
  var output = img.expression(
    "eqtime + 4*longitude - 60*time_zone",
    {
    eqtime: img.select("eqtime"),
    longitude: img.select("longitude"),
    time_zone: img.select("time_zone")
    });
  return output.rename('time_offset');
};

// True solar time (in minutes)
var tst_fun = function(img) {
  var output = img.expression(
    "hour*60 + min + sec/60 + time_offset",
    {
    hour: img.select("hour"),
    min: img.select("min"),
    sec: img.select("sec"),
    time_offset: img.select("time_offset")
    });
  return output.rename('tst');
};

// Solar hour angle (in degrees)
var ha_fun = function(img) {
  var output = img.expression(
    "(tst / 4) - 180",
    {
    tst: img.select("tst")
    });
  return output.rename('ha');
};

// First step of solar Elevation angle calculation
var ele_1_fun = function(img) {
  var output = img.expression(
    "sin_latitude_rad*sin_decl + cos_latitude_rad*cos_decl*cos_ha_rad",
    {
    sin_latitude_rad: img.select("sin_latitude_rad"),
    sin_decl: img.select("sin_decl"),
    cos_latitude_rad: img.select("cos_latitude_rad"),
    cos_decl: img.select("cos_decl"),
    cos_ha_rad: img.select("cos_ha_rad")
    });
  return output.rename('ele_1');
};

// First step of Azimuth angle calculation
var azimuth_1_fun = function(img) {
  var output = img.expression(
    "(sin_decl*cos_latitude_rad - cos_decl*sin_latitude_rad*cos_ha_rad) / cos_ele_rad",
    {
    sin_latitude_rad: img.select("sin_latitude_rad"),
    sin_decl: img.select("sin_decl"),
    cos_latitude_rad: img.select("cos_latitude_rad"),
    cos_decl: img.select("cos_decl"),
    cos_ha_rad: img.select("cos_ha_rad"),
    cos_ele_rad: img.select("cos_ele_rad")
    });
  return output.rename('azimuth_1');
};



///// -------------------------- \\\\\
/// Define Solar Position Function \\\
///// -------------------------- \\\\\

// Create function for export
exports.solar_fun = function(date, my_aoi) {
  
  // Check if aoi is present
  if (my_aoi === undefined || my_aoi === null){
    var rect = ee.Geometry.Rectangle([[-179.99, -85], [179.99, 85]]);
    var my_aoi = ee.Geometry({geoJson: rect, geodesic: false});
  }
  
  ///// ------- \\\\\
  /// Define Date \\\
  ///// ------- \\\\\
  
  // Get day of year, hour, minute and second as number
  var my_year = ee.Number.parse(date.format('y'));
  var my_doy = ee.Number.parse(date.format('D'));
  var my_hour = ee.Number.parse(date.format('H'));
  var my_min = ee.Number.parse(date.format('m'));
  var my_sec = ee.Number.parse(date.format('s'));
  
  // Create image from doy, hour, minute and second
  var my_doy_img = ee.Image.constant(my_doy).clip(my_aoi).rename("doy");
  var my_hour_img = ee.Image.constant(my_hour).clip(my_aoi).rename("hour");
  var my_min_img = ee.Image.constant(my_min).clip(my_aoi).rename("min");
  var my_sec_img = ee.Image.constant(my_sec).clip(my_aoi).rename("sec");
  
  // Combine bands into one image
  var img_comb = my_doy_img
    .addBands(my_hour_img)
    .addBands(my_min_img)
    .addBands(my_sec_img);
  
  
  ///// ------ \\\\\
  /// Time Zones \\\
  ///// ------ \\\\\
  
  // Clip time zones raster to aoi
  var time_zones_raster_clip = time_zones_raster.clip(my_aoi);
  
  // Add image as band
  var img_comb2 = img_comb.addBands(time_zones_raster_clip);
  
  
  ///// ---------------- \\\\\
  /// Check for leap years \\\
  ///// ---------------- \\\\\
  
  // Test is current year is among leap years and convert to local variable
  var leap_year_test = leap_year_list.contains(my_year);//.getInfo();
  
  // Define year denominator based on leap year test
  // -> If leap year use 366, else use 365
  // -> Relevant for calculating the fractional year
  var year_denominator = ee.Algorithms.If(leap_year_test, 366, 365);
  
  // Create image from year denominator
  var year_denominator_img = ee.Image.constant(year_denominator)
    .clip(my_aoi)
    .rename("year_denom");
  
  // Add image as band
  var img_comb3 = img_comb2.addBands(year_denominator_img);
  
  
  ///// ----------- \\\\\
  /// Fractional Year \\\
  ///// ----------- \\\\\
  
  // Create image with pi as pixel value
  var my_pi_img = ee.Image.constant(Math.PI).clip(my_aoi).rename("pi");
  
  // Add image as band
  var img_comb4 = img_comb3.addBands(my_pi_img);
  
  // Fractional year (in radians)
  var frac_year = frac_year_fun(img_comb4);
  
  // Add image as band
  var img_comb5 = img_comb4.addBands(frac_year);
  
  
  ///// ------------ \\\\\
  /// Equation of Time \\\
  ///// ------------ \\\\\
  
  // Calculate sin and cos of fractional year
  var sin_frac_year = frac_year.sin().rename('sin_frac_year');
  var sin_2frac_year = frac_year.multiply(2).sin().rename('sin_2frac_year');
  var sin_3frac_year = frac_year.multiply(3).sin().rename('sin_3frac_year');
  var cos_frac_year = frac_year.cos().rename('cos_frac_year');
  var cos_2frac_year = frac_year.multiply(2).cos().rename('cos_2frac_year');
  var cos_3frac_year = frac_year.multiply(3).cos().rename('cos_3frac_year');
  
  // Add images as bands
  var img_comb6 = img_comb5
    .addBands(sin_frac_year)
    .addBands(sin_2frac_year)
    .addBands(sin_3frac_year)
    .addBands(cos_frac_year)
    .addBands(cos_2frac_year)
    .addBands(cos_3frac_year);
  
  // Equation of time (in minutes)
  var eqtime = eqtime_fun(img_comb6);
  
  // Add image as band
  var img_comb7 = img_comb6.addBands(eqtime);
  
  
  ///// ------------------- \\\\\
  /// Solar Declination Angle \\\
  ///// ------------------- \\\\\
  
  // Solar declination angle (in radians)
  var decl = decl_fun(img_comb7);
  
  // Add image as band
  var img_comb8 = img_comb7.addBands(decl);
  
  
  ///// ------- \\\\\
  /// Time Offset \\\
  ///// ------- \\\\\
  
  // Create image with longitude and latitude information per pixel
  var lon_lat_img = ee.Image.pixelLonLat().clip(my_aoi);
  
  // Add image as band
  var img_comb9 = img_comb8.addBands(lon_lat_img);
  
  // Time offset (in minutes)
  var time_offset = time_offset_fun(img_comb9);
  
  // Add image as band
  var img_comb10 = img_comb9.addBands(time_offset);
  
  
  ///// ----------- \\\\\
  /// True Solar Time \\\
  ///// ----------- \\\\\
  
  // True solar time (in minutes)
  var tst = tst_fun(img_comb10);
  
  // Add image as band
  var img_comb11 = img_comb10.addBands(tst);
  
  
  ///// ------------ \\\\\
  /// Solar Hour Angle \\\
  ///// ------------ \\\\\
  
  // Solar hour angle (in degrees)
  var ha = ha_fun(img_comb11);
  
  // Add image as band
  var img_comb12 = img_comb11.addBands(ha);
  
  
  ///// -------------------- \\\\\
  /// Elevation Angle & Zenith \\\
  ///// -------------------- \\\\\
  
  // Convert bands in unit degrees to radians
  var lat_rad = deg2rad(img_comb12.select("latitude")).rename("latitude_rad");
  var ha_rad = deg2rad(ha).rename("ha_rad");
  
  // Calculate sin and cos of radians bands
  var sin_lat_rad = lat_rad.sin().rename("sin_latitude_rad");
  var sin_decl = decl.sin().rename("sin_decl");
  var cos_lat_rad = lat_rad.cos().rename("cos_latitude_rad");
  var cos_decl = decl.cos().rename("cos_decl");
  var cos_ha_rad = ha_rad.cos().rename("cos_ha_rad");
  
  // Add images as bands
  var img_comb13 = img_comb12
    .addBands(sin_lat_rad)
    .addBands(sin_decl)
    .addBands(cos_lat_rad)
    .addBands(cos_decl)
    .addBands(cos_ha_rad);
  
  // First step of solar Elevation angle calculation
  var ele_1 = ele_1_fun(img_comb13);
  
  // Solar elevation angle (in radians)
  var ele = rad2deg(ele_1.asin()).rename('ele');
  
  // Zenith (in degrees)
  var zenith = ee.Image.constant(90).clip(my_aoi).subtract(ele).rename("zenith");
  
  // Add images as bands
  var img_comb14 = img_comb13
    .addBands(ele)
    .addBands(zenith);
  
  
  ///// --- \\\\\
  /// Azimuth \\\
  ///// --- \\\\\
  
  // Calculate cosine of elevation and convert degree to radians
  var cos_ele_rad = deg2rad(ele).cos().rename("cos_ele_rad");
  
  // Add image as band
  var img_comb15 = img_comb14.addBands(cos_ele_rad);
  
  // First step of Azimuth angle calculation
  var azimuth_1 = azimuth_1_fun(img_comb15);
  
  // Azimuth angle (in degree)
  var azimuth_2 = rad2deg(azimuth_1.acos());
  
  // Check for areas where hour angle is positive and set pixel value to 360
  var ha_mask = ha.gte(0).multiply(360);
  
  // Subtract azimuth from hour angle mask and calculate absolute pixel value
  // -> Final Azimuth angle (in degrees)
  var azimuth_final = ha_mask.subtract(azimuth_2).abs().rename('azimuth');
  
  // Add image as band
  var img_comb16 = img_comb15.addBands(azimuth_final);
  
  
  ///// -------- \\\\\
  /// Output Image \\\
  ///// -------- \\\\\
  
  // Select bands for output image
  var out = img_comb16.select("time_zone")
    .addBands(img_comb16.select("frac_year"))
    .addBands(img_comb16.select("decl"))
    .addBands(img_comb16.select("time_offset"))
    .addBands(img_comb16.select("latitude"))
    .addBands(img_comb16.select("longitude"))
    .addBands(img_comb16.select("tst"))
    .addBands(img_comb16.select("ha"))
    .addBands(img_comb16.select("ele"))
    .addBands(img_comb16.select("zenith"))
    .addBands(img_comb16.select("azimuth"));
  
  // Return output image
  return out;
};
