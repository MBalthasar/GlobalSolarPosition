//==========================================================================//
//
// Description: Script for an interactive GEE application for visualizing
//              the solar elevation, zenith, and azimuth angles for a given
//              date and time on a global scale.
// Author: Marius Philipp
// Date: 2022-10-03
//  
//==========================================================================//


//// ------------- \\\\\
/// Import Functions \\\
//// ------------- \\\\\


// Import functions from another script
var Imported = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Position_Function');
var Imported2 = require('users/mbalthasarphilipp/GlobalSolarPosition:Functions/Solar_Surface_Position_Function');



///// -------- \\\\\
/// Prepare DEMs \\\
///// -------- \\\\\


// Load ALOS Palsar DSM and clip to aoi
var alos = ee.ImageCollection("JAXA/ALOS/AW3D30/V3_2")
  .select("DSM")
  .median()
  .toInt16()
  .rename("elevation")
  .set('DEM_Type', 'ALOS');


// Load SRTM and clip to aoi
var srtm = ee.Image("USGS/SRTMGL1_003")
  .rename("elevation")
  .set('DEM_Type', 'SRTM');


// Load copernicus dem
// https://code.earthengine.google.com/f6479dc43ab9c13dd1cc9bd527cf0c01
var glo30 = ee.ImageCollection("projects/sat-io/open-datasets/GLO-30")
  .mosaic()
  .setDefaultProjection('EPSG:3857',null,30)
  .toInt16()
  .rename("elevation")
  .set('DEM_Type', 'GLO-30');


// Combine images to ImageCollection
var dem_col = ee.ImageCollection([alos, glo30, srtm]);



/*******************************************************************************
 *                              Model Section                                  *
 *******************************************************************************/


// Define emtpy dictionary for storing the data.
var m = {};


// Define list of digital elevation models
// var dem_list = ['SRTM', 'ALOS', 'GLO-30'];
var dem_list = ['SRTM', 'GLO-30'];


// Add information of dem selection to data object
m.dems = dem_list;


// Define list of options for adding a hillshade
var layer_list = ['Time Zone', 'Solar Elevation', 'Solar Zenith', 
                  'Solar-Surface Elevation', 'Solar-Surface Zenith', 
                  'Solar Azimuth', 'Solar-Surface Azimuth',
                  'Slope', 'Aspect', 'Hillshade'];


// Add information of hillshade selection to data dictionary
m.layer_list = layer_list;


// Add ImageCollection to data dictionary
m.dem_col = dem_col;



/******************************************************************************
 *                          Components Section                                *
 ******************************************************************************/


// Define a JSON object for storing UI components.
var c = {};


// Adding general control panel and map
c.controlPanel = ui.Panel();  // Define control panel
c.map = ui.Map();  // Define Map panel


// Adding title and app description
c.info = {};
c.info.title = ui.Label('Global Solar Position');
c.info.about = ui.Label('This apps purpose is to visualize the solar elevation, zenith, ' + 
  'and azimuth angles for a given date and time on a global scale.');
c.info.link = ui.Label({
  value: 'Further details are provided here',
  targetUrl: 'https://github.com/MBalthasar/GlobalSolarPosition.git'
});
c.info.panel = ui.Panel([c.info.title, c.info.about, c.info.link]);


// Add a select button for the DEM selection
c.selectDEM = {};
c.selectDEM.title = ui.Label('Selection of a DEM');
c.selectDEM.about = ui.Label('The user can choose between ' +
  'the Copernicus (GLO-30) DEM, and the Shuttle Radar Topography Mission (SRTM) DEM. ' +
  'The srtm coverage is hereby limited between 60° North and 56° South.');
c.selectDEM.selector = ui.Select({items: m.dems, placeholder: 'Choose DEM', value: 'SRTM'});
c.selectDEM.panel = ui.Panel([c.selectDEM.title, c.selectDEM.about, c.selectDEM.selector]);


// Add textboxes for min and max values
c.selectMinMax = {};
c.selectMinMax.title = ui.Label('Min/Max Values for Scale');
c.selectMinMax.about = ui.Label('Here, the user can define min and max values in meters to adjust the DEM visualization.');
c.selectMinMax.Min = ui.Textbox({value: '0'});
c.selectMinMax.Max = ui.Textbox({value: '3000'});
c.selectMinMax.panel = ui.Panel([c.selectMinMax.title, c.selectMinMax.about, c.selectMinMax.Min, c.selectMinMax.Max]);


// Add textboxes for the date
c.selectDate = {};
c.selectDate.title = ui.Label('Date and Time Selection');
c.selectDate.about = ui.Label('The user can define a given datetime for which the solar computations are executed. ' + 
  'The datetime object should be provided in the following format: ' +
  'YYYY-MM-DDTHH:MM:SS. E.g. 2022-08-27T15:30:12');
c.selectDate.aDate = ui.Textbox({value: '2022-08-27T15:30:12'});
c.selectDate.panel = ui.Panel([c.selectDate.title, c.selectDate.about, c.selectDate.aDate]);


// Add a select button for the layer selection
c.selectLayer = {};
c.selectLayer.title = ui.Label('Selection of Solar/Terrain Layer');
c.selectLayer.about = ui.Label('Here, the user can decide which solar/terrain layer should be displayed. ' +
  'The \'Solar-Surface Elevation\', \'Solar-Surface Zenith\' and \'Solar-Surface Azimuth\' angles hereby represent the Solar elevation, ' + 
  'zenith, and azimuth relative the surface\'s slope and aspect based on the selected DEM.');
c.selectLayer.selector = ui.Select({items: m.layer_list, value: 'Hillshade'});
c.selectLayer.panel = ui.Panel([c.selectLayer.title, c.selectLayer.about, c.selectLayer.selector]);


// Define dividers
c.dividers = {};
c.dividers.divider1 = ui.Panel();
c.dividers.divider2 = ui.Panel();
c.dividers.divider3 = ui.Panel();
c.dividers.divider4 = ui.Panel();
c.dividers.divider5 = ui.Panel();


// Define a legend widget group.
c.legend = {};
c.legend.title = ui.Label();
c.legend.colorbar = ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legend.leftLabel = ui.Label('[min]');
c.legend.centerLabel = ui.Label();
c.legend.rightLabel = ui.Label('[max]');
c.legend.labelPanel = ui.Panel({
  widgets: [
    c.legend.leftLabel,
    c.legend.centerLabel,
    c.legend.rightLabel,
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
c.legend.panel = ui.Panel([
  c.legend.title,
  c.legend.colorbar,
  c.legend.labelPanel
]);


// Define a second legend widget group.
c.legend2 = {};
c.legend2.title = ui.Label();
c.legend2.colorbar = ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legend2.leftLabel = ui.Label('[min]');
c.legend2.centerLabel = ui.Label();
c.legend2.rightLabel = ui.Label('[max]');
c.legend2.labelPanel = ui.Panel({
  widgets: [
    c.legend2.leftLabel,
    c.legend2.centerLabel,
    c.legend2.rightLabel,
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
c.legend2.panel = ui.Panel([
  c.legend2.title,
  c.legend2.colorbar,
  c.legend2.labelPanel
]);


// Panel for values after user clicks on map
c.click = {};
c.click.title = ui.Label('Click on map to retreive values');
c.click.leftLabel = ui.Label();
c.click.centerLabel = ui.Label();
c.click.rightLabel = ui.Label();
c.click.labelPanel = ui.Panel({
  widgets: [
    c.click.leftLabel,
    c.click.centerLabel,
    c.click.rightLabel,
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
c.click.panel = ui.Panel([
  c.click.title,
  c.click.labelPanel
]);



/*******************************************************************************
 *                            Composition Section                              *
 *******************************************************************************/


ui.root.clear();  // Clear root
ui.root.add(c.controlPanel);  // Add control panel to root
ui.root.add(c.map);  // Ad map panel to root


// Add subpanels
c.controlPanel.add(c.info.panel); // Add title and description
c.controlPanel.add(c.dividers.divider1); // Add divider
c.controlPanel.add(c.selectDEM.panel); // Add DEM Selection subpanel
c.controlPanel.add(c.dividers.divider2); // Add divider
c.controlPanel.add(c.selectMinMax.panel); // Add min max selection subpanel
c.controlPanel.add(c.dividers.divider3); // Add divider
c.controlPanel.add(c.selectDate.panel); // Add Date selection subpanel
c.controlPanel.add(c.dividers.divider4); // Add divider
c.controlPanel.add(c.selectLayer.panel); // Add Layer selection subpanel
c.controlPanel.add(c.dividers.divider5); // Add divider
c.map.add(c.legend.panel); // Add legend
c.map.add(c.legend2.panel); // Add legend2
c.map.add(c.click.panel); // Add click panel



/*******************************************************************************
 *                            Styling Section                                  *
 *******************************************************************************/


// Define a JSON object for defining CSS-like class style properties.
var s = {};


// Define style options of the general control panel
c.controlPanel.style().set({width: '350px'});


// Define style option for the curser
c.map.style().set('cursor', 'crosshair');


// Adjust font of title and description
s.info = {};
s.info.title = {
  fontWeight: 'bold',
  fontSize: '20px',
  color: '#636363'
};
s.info.about = {
  fontSize: '13px'
};
s.info.link = {
  fontSize: '13px'
};


// Apply changes
c.info.title.style().set(s.info.title);
c.info.about.style().set(s.info.about);
c.info.link.style().set(s.info.link);


// Adjust font of DEM selection and description
s.selectDEM = {};
s.selectDEM.title = {
  fontWeight: 'bold',
  fontSize: '15px',
  color: '#636363'
};
s.selectDEM.about = {
  fontSize: '13px',
  color: '#636363'
};


// Apply changes
c.selectDEM.title.style().set(s.selectDEM.title);
c.selectDEM.about.style().set(s.selectDEM.about);


// Adjust font of min max selection and description
s.selectMinMax = {};
s.selectMinMax.title = {
  fontWeight: 'bold',
  fontSize: '15px',
  color: '#636363'
};
s.selectMinMax.about = {
  fontSize: '13px',
  color: '#636363'
};


// Apply changes
c.selectMinMax.title.style().set(s.selectMinMax.title);
c.selectMinMax.about.style().set(s.selectMinMax.about);


// Adjust font of date selection and description
s.selectDate = {};
s.selectDate.title = {
  fontWeight: 'bold',
  fontSize: '15px',
  color: '#636363'
};
s.selectDate.about = {
  fontSize: '13px',
  color: '#636363'
};


// Apply changes
c.selectDate.title.style().set(s.selectDate.title);
c.selectDate.about.style().set(s.selectDate.about);


// Adjust font of Layer selection and description
s.selectLayer = {};
s.selectLayer.title = {
  fontWeight: 'bold',
  fontSize: '15px',
  color: '#636363'
};
s.selectLayer.about = {
  fontSize: '13px',
  color: '#636363'
};


// Apply changes
c.selectLayer.title.style().set(s.selectLayer.title);
c.selectLayer.about.style().set(s.selectLayer.about);


// Adjust sytle of dividers
s.dividers = {};
s.dividers.divider1 = {backgroundColor: 'F0F0F0', height: '4px', margin: '10px 0px'};
s.dividers.divider2 = {backgroundColor: 'F0F0F0', height: '4px', margin: '10px 0px'};
s.dividers.divider3 = {backgroundColor: 'F0F0F0', height: '4px', margin: '10px 0px'};
s.dividers.divider4 = {backgroundColor: 'F0F0F0', height: '4px', margin: '10px 0px'};
s.dividers.divider5 = {backgroundColor: 'FFFFFF', height: '50px', margin: '10px 0px'};


// Apply changes
c.dividers.divider1.style().set(s.dividers.divider1);
c.dividers.divider2.style().set(s.dividers.divider2);
c.dividers.divider3.style().set(s.dividers.divider3);
c.dividers.divider4.style().set(s.dividers.divider4);
c.dividers.divider5.style().set(s.dividers.divider5);


// Define background colours for panels
s.opacityWhiteMed = {
  backgroundColor: 'rgba(255, 255, 255, 0.9)'
};
s.opacityWhiteNone = {
  backgroundColor: 'rgba(255, 255, 255, 0)'
};


// Apply changes on first legend
c.legend.title.style().set({
  fontWeight: 'bold',
  fontSize: '14px',
  color: '383838'
});
c.legend.title.style().set(s.opacityWhiteNone);
c.legend.colorbar.style().set({
  stretch: 'horizontal',
  margin: '0px 8px',
  maxHeight: '20px'
});
c.legend.leftLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px'
});
c.legend.leftLabel.style().set(s.opacityWhiteNone);
c.legend.centerLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px',
  textAlign: 'center',
  stretch: 'horizontal'
});
c.legend.centerLabel.style().set(s.opacityWhiteNone);
c.legend.rightLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px'
});
c.legend.rightLabel.style().set(s.opacityWhiteNone);
c.legend.panel.style().set({
  position: 'bottom-left',
  width: '250px',
  padding: '0px'});
c.legend.panel.style().set(s.opacityWhiteMed);
c.legend.labelPanel.style().set(s.opacityWhiteNone);


// Apply changes on second legend
c.legend2.title.style().set({
  fontWeight: 'bold',
  fontSize: '14px',
  color: '383838'
});
c.legend2.title.style().set(s.opacityWhiteNone);
c.legend2.colorbar.style().set({
  stretch: 'horizontal',
  margin: '0px 8px',
  maxHeight: '20px'
});
c.legend2.leftLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px'
});
c.legend2.leftLabel.style().set(s.opacityWhiteNone);
c.legend2.centerLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px',
  textAlign: 'center',
  stretch: 'horizontal'
});
c.legend2.centerLabel.style().set(s.opacityWhiteNone);
c.legend2.rightLabel.style().set({
  margin: '4px 8px',
  fontSize: '14px'
});
c.legend2.rightLabel.style().set(s.opacityWhiteNone);
c.legend2.panel.style().set({
  position: 'bottom-right',
  width: '250px',
  padding: '0px'});
c.legend2.panel.style().set(s.opacityWhiteMed);
c.legend2.labelPanel.style().set(s.opacityWhiteNone);


// Set styles on click panel
c.click.panel.style().set(s.opacityWhiteMed);
c.click.title.style().set({
  fontWeight: 'bold',
  fontSize: '16px',
  color: '383838'
});
c.click.title.style().set(s.opacityWhiteNone);
c.click.leftLabel.style().set({
  margin: '4px 2px',
  fontSize: '14px'
});
c.click.leftLabel.style().set(s.opacityWhiteNone);
c.click.centerLabel.style().set({
  margin: '4px 2px',
  fontSize: '14px',
  textAlign: 'center',
  stretch: 'horizontal'
});
c.click.centerLabel.style().set(s.opacityWhiteNone);
c.click.rightLabel.style().set({
  margin: '4px 2px',
  fontSize: '14px',
  textAlign: 'center',
  stretch: 'horizontal'
});
c.click.rightLabel.style().set(s.opacityWhiteNone);
c.click.panel.style().set({
  position: 'top-center',
  width: '650px',
  padding: '0px'});
c.click.panel.style().set(s.opacityWhiteMed);
c.click.labelPanel.style().set(s.opacityWhiteNone);

s.countryborders = {
    'color': '#FFEFCA', 
    'pointSize': 3,
    'pointShape': 'circle',
    'width': 1,
    'lineType': 'solid',
    'fillColor': '00000000',
};


/*******************************************************************************
 *                            Behavior Section                                 *
 ******************************************************************************/


// Define callback function on DEM selection
function updateDEM(){
  // Get dem name from selector
  var dem_name = c.selectDEM.selector.getValue();
  // Filter ImageCollection to current dem
  var dem = m.dem_col.filterMetadata('DEM_Type', 'equals', dem_name).first();
  // Define current min and max value
  var min = ee.Number.parse(c.selectMinMax.Min.getValue());
  var max = ee.Number.parse(c.selectMinMax.Max.getValue());
  // Define layer to map
  var layer = ui.Map.Layer({
    eeObject: dem,
    visParams: {palette: ['grey', 'lightgreen', 'khaki', 'brown', 'white'], min: min.getInfo(), max: max.getInfo()},
    name: dem_name
  });
  // Add layer to map
  c.map.layers().set(0, layer); // Define nth layer
}


// Define callback function on Layer selection
function updateLayer(){
  // Get dem name from selector
  var dem_name = c.selectDEM.selector.getValue();
  // Filter ImageCollection to current dem
  var dem = m.dem_col.filterMetadata('DEM_Type', 'equals', dem_name).first();
  // Get value from layer selector
  var layer_option = c.selectLayer.selector.getValue();
  // Get date from date selector
  var current_date = ee.Date(c.selectDate.aDate.getValue());
  // Execute solar functions
  var solar_postion = Imported.solar_fun(current_date);
  var solar_surface = Imported2.solar_surface_fun(current_date, null, dem);
  // Extract relevant variables
  var time_zone = solar_postion.select('time_zone');
  var ele = solar_postion.select('ele');
  var zenith = solar_postion.select('zenith');
  var azimuth = solar_postion.select('azimuth');
  var surface_ele = solar_surface.select('surface_ele');
  var surface_zenith = solar_surface.select('surface_zenith');
  var surface_azimuth = solar_surface.select('surface_azimuth');
  // Execute terrain functions
  var hill = ee.Terrain.hillshade(dem);
  var slo = ee.Terrain.slope(dem);
  var asp = ee.Terrain.aspect(dem);
  // Add layer to map
  if (layer_option == 'Time Zone'){
    // Define visualization
    var layer3 = ui.Map.Layer({
      eeObject: time_zone,
      visParams: {min: -12, max: 12},
      name: 'Time Zone'
    });
    // Add layer to map
    c.map.layers().set(1, layer3); // Define nth layer
  } else if (layer_option == 'Solar Elevation') {
    // Define visualization
    var layer4 = ui.Map.Layer({
      eeObject: ele,
      visParams: {min: 0, max: 90},
      name: 'Solar Elevation'
    });
    // Add layer to map
    c.map.layers().set(1, layer4); // Define nth layer
  } else if (layer_option == 'Solar Zenith') {
    // Define visualization
    var layer5 = ui.Map.Layer({
      eeObject: zenith,
      visParams: {min: 0, max: 90},
      name: 'Solar Zenith'
    });
    // Add layer to map
    c.map.layers().set(1, layer5); // Define nth layer
  } else if (layer_option == 'Solar Azimuth') {
    // Define visualization
    var layer6 = ui.Map.Layer({
      eeObject: azimuth,
      visParams: {min: 90, max: 270},
      name: 'Solar Azimuth'
    });
    // Add layer to map
    c.map.layers().set(1, layer6); // Define nth layer
  } else if (layer_option == 'Solar-Surface Elevation') {
    // Define visualization
    var layer7 = ui.Map.Layer({
      eeObject: surface_ele,
      visParams: {min: 0, max: 90},
      name: 'Solar-Surface Elevation'
    });
    // Add layer to map
    c.map.layers().set(1, layer7); // Define nth layer
  } else if (layer_option == 'Solar-Surface Zenith') {
    // Define visualization
    var layer8 = ui.Map.Layer({
      eeObject: surface_zenith,
      visParams: {min: 0, max: 90},
      name: 'Solar-Surface Zenith'
    });
    // Add layer to map
    c.map.layers().set(1, layer8); // Define nth layer
  } else if (layer_option == 'Solar-Surface Azimuth') {
    // Define visualization
    var layer9 = ui.Map.Layer({
      eeObject: surface_azimuth,
      visParams: {min: 0, max: 360},
      name: 'Solar-Surface Azimuth'
    });
    // Add layer to map
    c.map.layers().set(1, layer9); // Define nth layer
  } else if (layer_option == 'Slope') {
    // Define visualization
    var layer10 = ui.Map.Layer({
      eeObject: slo,
      visParams: {min: 0, max: 90},
      name: 'Slope'
    });
    // Add layer to map
    c.map.layers().set(1, layer10); // Define nth layer
  } else if (layer_option == 'Aspect') {
    // Define visualization
    var layer11 = ui.Map.Layer({
      eeObject: asp,
      visParams: {palette: ['green', 'yellow', 'yellow', 'orange', 'orange', 'blue', 'blue', 'green'], min: 0, max: 360},
      name: 'Aspect'
    });
    // Add layer to map
    c.map.layers().set(1, layer11); // Define nth layer
  } else {
    // Define visualization
    var layer12 = ui.Map.Layer({
      eeObject: hill,
      visParams: {min: 0, max: 255},
      opacity: 0.3,
      name: 'Hillshade'
    });
    // Add layer to map
    c.map.layers().set(1, layer12); // Define nth layer
  }
}


// Callback function for updating the DEM legend
function updateLegend() {
  c.legend.title.setValue(c.selectDEM.selector.getValue() + ' Height in m');
  c.legend.colorbar.setParams({
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x10',
    format: 'png',
    min: 0,
    max: 1,
    palette: ['grey', 'lightgreen', 'khaki', 'brown', 'white']
  });
  c.legend.leftLabel.setValue(c.selectMinMax.Min.getValue());
  c.legend.centerLabel.setValue(c.selectMinMax.Max.getValue() / 2);
  c.legend.rightLabel.setValue(c.selectMinMax.Max.getValue());
}


// Callback function for updating the layer legend
function updateLegend2() {
  // Get value of Layer selector
  var current_layer = c.selectLayer.selector.getValue();
  // Check layer
  if (current_layer == 'Time Zone'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue());
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(-12);
    c.legend2.centerLabel.setValue(0);
    c.legend2.rightLabel.setValue(12);
  } else if (current_layer == 'Solar Azimuth'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(90);
    c.legend2.centerLabel.setValue(180);
    c.legend2.rightLabel.setValue(270);
  } else if (current_layer == 'Solar Elevation'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(45);
    c.legend2.rightLabel.setValue(90);
  } else if (current_layer == 'Solar Zenith'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(45);
    c.legend2.rightLabel.setValue(90);
  } else if (current_layer == 'Solar-Surface Azimuth'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(180);
    c.legend2.rightLabel.setValue(360);
  } else if (current_layer == 'Solar-Surface Elevation'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(45);
    c.legend2.rightLabel.setValue(90);
  } else if (current_layer == 'Solar-Surface Zenith'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(45);
    c.legend2.rightLabel.setValue(90);
  } else if (current_layer == 'Slope'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(45);
    c.legend2.rightLabel.setValue(90);
  } else if (current_layer == 'Aspect'){
    c.legend2.title.setValue(c.selectLayer.selector.getValue() + ' in degrees');
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['green', 'yellow', 'yellow', 'orange', 'orange', 'blue', 'blue', 'green']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(180);
    c.legend2.rightLabel.setValue(360);
  // For hillshade
  } else {
    c.legend2.title.setValue(c.selectLayer.selector.getValue());
    c.legend2.colorbar.setParams({
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x10',
      format: 'png',
      min: 0,
      max: 1,
      palette: ['black', 'white']
    });
    c.legend2.leftLabel.setValue(0);
    c.legend2.centerLabel.setValue(127.5);
    c.legend2.rightLabel.setValue(255);
  }
}


// Update layers on change
c.selectDEM.selector.onChange(updateDEM);
c.selectDEM.selector.onChange(updateLayer);
c.selectMinMax.Min.onChange(updateDEM);
c.selectMinMax.Max.onChange(updateDEM);
c.selectDate.aDate.onChange(updateLayer);
c.selectLayer.selector.onChange(updateLayer);


// Update legends on change
c.selectDEM.selector.onChange(updateLegend);
c.selectDEM.selector.onChange(updateLegend2);
c.selectMinMax.Min.onChange(updateLegend);
c.selectMinMax.Max.onChange(updateLegend);
c.selectDate.aDate.onChange(updateLegend2);
c.selectLayer.selector.onChange(updateLegend2);


// Create function to return values based on click
c.map.onClick(function(coords) {
  // While values are being evaluated, write "loading..."
  c.click.leftLabel.setValue("loading...");
  c.click.centerLabel.setValue("loading...");
  c.click.rightLabel.setValue("loading...");
  // Get long lat coordinates
  var location = 'lon: ' + coords.lon.toFixed(4) + '; ' +
                 'lat: ' + coords.lat.toFixed(4);
  // Set value for left label
  c.click.leftLabel.setValue(location);
  // Create point from coordinates
  var click_point = ee.Geometry.Point(coords.lon, coords.lat);
  // Get dem name from selector
  var dem_name = c.selectDEM.selector.getValue();
  // Filter ImageCollection to current dem
  var dem = m.dem_col.filterMetadata('DEM_Type', 'equals', dem_name).first();
  // Get dem value
  var demValue = dem.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var demText = 'Elevation: ' + val.elevation + ' m';
    c.click.centerLabel.setValue(demText);
  });
  // Get date from date selector
  var current_date = ee.Date(c.selectDate.aDate.getValue());
  // Execute solar functions
  var solar_postion = Imported.solar_fun(current_date);
  var solar_surface = Imported2.solar_surface_fun(current_date, null, dem);
  // Extract relevant variables
  var time_zone = solar_postion.select('time_zone');
  var ele = solar_postion.select('ele');
  var zenith = solar_postion.select('zenith');
  var azimuth = solar_postion.select('azimuth');
  var surface_ele = solar_surface.select('surface_ele');
  var surface_zenith = solar_surface.select('surface_zenith');
  var surface_azimuth = solar_surface.select('surface_azimuth');
  // Execute terrain functions
  var hill = ee.Terrain.hillshade(dem).rename('hill');
  var slo = ee.Terrain.slope(dem).rename('slo');
  var asp = ee.Terrain.aspect(dem).rename('asp');
  // Get value of Layer selector
  var current_layer = c.selectLayer.selector.getValue();
  if (current_layer == 'Time Zone'){
    var layerValue2 = time_zone.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText2 = 'Time Zone: ' + val.time_zone;
    c.click.rightLabel.setValue(layerText2);
    });
  } else if (current_layer == 'Solar Elevation'){
    var layerValue3 = ele.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText3 = 'Solar Elevaton: ' + val.ele.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText3);
    });
  } else if (current_layer == 'Solar Zenith'){
    var layerValue4 = zenith.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText4 = 'Solar Zenith: ' + val.zenith.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText4);
    });
  } else if (current_layer == 'Solar Azimuth'){
    var layerValue5 = azimuth.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText5 = 'Solar Azimuth: ' + val.azimuth.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText5);
    });
  } else if (current_layer == 'Solar-Surface Elevation'){
    var layerValue6 = surface_ele.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText6 = 'Solar-Surface Elevation: ' + val.surface_ele.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText6);
    });
  } else if (current_layer == 'Solar-Surface Zenith'){
    var layerValue7 = surface_zenith.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText7 = 'Solar-Surface Zenith: ' + val.surface_zenith.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText7);
    });
  } else if (current_layer == 'Solar-Surface Azimuth'){
    var layerValue8 = surface_azimuth.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText8 = 'Solar-Surface Azimuth: ' + val.surface_azimuth.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText8);
    });
  } else if (current_layer == 'Slope'){
    var layerValue9 = slo.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText9 = 'Slope: ' + val.slo.toFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText9);
    });
  } else if (current_layer == 'Aspect'){
    var layerValue10 = asp.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText10 = 'Aspect: ' + val.asptoFixed(2) + ' °';
    c.click.rightLabel.setValue(layerText10);
    });
  // For hillshade
  } else {
    var layerValue11 = hill.reduceRegion(ee.Reducer.first(), click_point, 30).evaluate(function(val){
    var layerText11 = 'Hillshade: ' + val.hill.toFixed(2);
    c.click.rightLabel.setValue(layerText11);
    });
  }
});



/*******************************************************************************
 *                         Initialize Section                                  *
 *******************************************************************************/


// Zoom to location and given zoom level
c.map.setCenter(11, 46.6, 6);


// Render the map and legend.
updateDEM();
updateLayer();
updateLegend();
updateLegend2();
