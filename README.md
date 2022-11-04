# GlobalSolarPosition

[![DOI](https://zenodo.org/badge/544945169.svg)](https://zenodo.org/badge/latestdoi/544945169)

Global computation of the solar position at a given time in Google Earth Engine. The calculations of the solar zenith and azimuth angles are based on the [following equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF). The angles are computed for a given local time with respect to the present time zone based on the [Natural Earth time zones dataset](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/timezones/).

<img src="img/solar-surface-animation.gif" width=1000>


## Available Functions

The following functions are currently available:

* `Solar_Position_Function` Script for computing the the solar elevation, zenith, and azimuth angles for a given date and time on a global scale.
* `Solar_Surface_Position_Function` Script for computing the the solar-surface elevation, zenith, and azimuth angles for a given date and time on a global scale. The angles hereby represent the solar elevation, zenith, and azimuth relative the surface's slope and aspect based on a given digital elevation model (DEM).


## Google Earth Engine Application

An interactive Google Earth Engine application for visualizing the solar elevation, zenith, and azimuth angles for a given date and time on a global scale can be [accessed here](https://mbalthasarphilipp.users.earthengine.app/view/globalsolarposition).

<img src="img/gee_app.gif" width=1000>


## Shadow Casting and Total Daily Solar Hours

Information about the solar azimuth and elevation angles of a given region and datetime allows for the computation and visualization of shadow movement and the total solar hours for any date. [This example script](https://code.earthengine.google.com/1b28a61e3c582126e4dd335202b07265) animates the shadow casting on a 10 minutes basis in an alpine environment by combining the `Solar_Position_Function` of this repository with the GEE built-in `ee.Algorithms.HillShadow` function:

<img src="img/hillshadow_video_final.gif" width=1000>


## Citation
Philipp, M. (2022): GobalSolarPosition V.1.0. Zenodo. https://doi.org/10.5281/zenodo.7139847.

