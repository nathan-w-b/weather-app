
/**
 * switch between Celsius or Fahrenheit for the webpage, if page is populated with location: refreshes page
 */
function switchTempUnit(){
    if (temperatureUnit === "f"){
        temperatureUnit = "c";
    }
    else {
        temperatureUnit = "f";
    }
    document.getElementById("btnDegree").innerHTML = getTempSuffix();
    refreshLocation();
}

/**
 * get the temperature unit abbreviation for Celsius or Fahrenheit depending on global temperatureUnit var
 * @returns {string} "°F" or "°C"
 */
function getTempSuffix() {
    if (temperatureUnit === "f"){
        return "°F";
    }
    else {
        return "°C";
    }
}


/**
 * get the speed unit abbreviation mph or kph depending on global temperatureUnit var
 * @returns {string} "mph" or "kph"
 */
function getWindSpeedSuffix(){
    if (temperatureUnit === "f"){
        return "mph";
    }
    else {
        return "kph";
    }
}

/**
 * send the given functions and search string to the WeatherHandler
 * @param searchString {string} location string to search for locations through the weatherAPI
 * @param successFunction {function} function to be run if search query succeeds (input = proccessedResponse, errors)
 * @param failFunction {function} function to be run if search query fails
 */
function searchForLocations(searchString, successFunction, failFunction){
    weather.requestWeather("search", searchString, successFunction, failFunction);
}

/**
 * refresh the site body with weather data for the location provided
 * if no location provided: use current location and data in memory
 * @param location {LocationData, null} default: null, if no location provided use current location
 */
function refreshLocation(location = null){
    if (location !== null && freeToQuery()) {
        displayLoading();
        currentLocation = location;
        document.body.style.cursor = "wait";
        weather.requestWeather("forecast", location, weatherRequestSuccess, weatherRequestFail);
    } else if (currentData !== null) {
        loadWeatherData();
    }
}

/**
 * force a refresh of all the data on the page with fresh data from the server
 */
function forceLocationRefresh(){
    refreshLocation(currentLocation);
}

/**
 * take the processed information from the weatherAPI and send it to the GUI
 * @param dataJSON {object, null} a processed JSON object full of information received from weatherAPI
 * @param errors {array} an array of errors in the information received from weatherAPI
 */
function weatherRequestSuccess(dataJSON= null, errors = []) {
    document.body.style.cursor = "default";
    document.getElementById("divCurrentWeatherWrapper").style.display = "flex";
    document.getElementById("divUserInformationDisplay").style.display = "none";
    enableRefreshButton();
    console.log(errors);
    loadWeatherData(dataJSON, errors);
}

/**
 * display to the user that contact with the server was unsuccessful
 */
function weatherRequestFail(){
    document.body.style.cursor = "default";
    document.getElementById("divCurrentWeatherWrapper").style.display = "none";
    document.getElementById("txtUserInformation").innerHTML = "Could Not Contact Server.";
    document.getElementById("divUserInformationDisplay").style.display = "flex";
}

/**
 * load the weather data, either provided or from memory, and refresh the page with the new data
 * @param dataJSON {object, null} defaults: null; if null use the data in memory, JSON object that will
 * be used to refresh the data on the page
 * @param errors {array} defaults: []; list of errors in data received from weatherAPI
 */
function loadWeatherData(dataJSON= null, errors = []){
    displayLoading(false);
    // if data provided and in memory are null, report error
    if (dataJSON === null && currentData === null) {
        console.log("No Data in Memory!");
        weatherRequestFail();
        return;
    }
    // if data provided is null, use data in memory
    else if (dataJSON === null) dataJSON = currentData;
    // else update data in memory with data provided
    else currentData = dataJSON;

    // inform the user of errors in data if any exist
    console.log(errors);
    displayErrors(errors);
    // grab the location from the query and populate appropriate elements with full location name
    currentLocation = processLocation(dataJSON.location);
    document.getElementById("txtLocationName").innerHTML = currentLocation.getDisplayString();

    // populate current weather with queried information
    document.getElementById("divCurrentWeatherBody").style.backgroundImage =
        getBackgroundImageString(dataJSON.current.condition.code);
    document.getElementById("txtCurrentWeatherHeader").innerHTML =
        getWeekdayString(dataJSON.current.last_updated) +
        "<span id='gatherTime' class='subtext'> as of: " + dataJSON.current.last_updated + "</span>";
    document.getElementById("imgCurrentWeather").src = "https://" + dataJSON.current.condition.icon;
    document.getElementById("txtCurrentWeatherTemp").innerHTML =
        getMomentaryTemp(dataJSON.current) + getTempSuffix();
    document.getElementById("txtCurrentWeatherCondition").innerHTML = dataJSON.current.condition.text;
    let txtCurrentWeatherData = document.getElementById("txtCurrentWeatherData")
    txtCurrentWeatherData.innerHTML = "";
    addSnapshotElements(txtCurrentWeatherData, dataJSON.forecast.forecastday[0]);

    // populate forecast weather
    let forecastBody = document.getElementById("divForecastWeather");
    forecastBody.innerHTML = "";
    let forecastDayDirection = "column";
    if (dataJSON.forecast.forecastday.length < 5) forecastDayDirection = "row";
    for (let i = 1; i < dataJSON.forecast.forecastday.length; i++) {
        let newForecastDaySummary =
            createForecastDaySummary(dataJSON.forecast.forecastday[i], forecastDayDirection);
        forecastBody.appendChild(newForecastDaySummary);
    }
    forecastBody.lastElementChild.style.borderRight = "none"

    let forecastHourlyBody = document.getElementById("divHourlyWeather");
    forecastHourlyBody.innerHTML = "";
    forecastHourlyBody.appendChild(createForecastHourTitle());
    for (let i = 0; i < 24; i++){
        let newForecastHourSummary = createForecastHourSummary(dataJSON.forecast.forecastday[0].hour[i])
        forecastHourlyBody.appendChild(newForecastHourSummary);
    }
    forecastHourlyBody.firstElementChild.style.borderTop = "none"
    animateForecastElements();
}

/**
 * process the location JSON object from the weatherAPI and return a LocationData object with that data
 * @param locationJSON {object} location JSON object from weatherAPI
 * @returns {LocationData} data from the location JSON object
 */
function processLocation(locationJSON){
    let newLocation = new LocationData();
    newLocation.updateFromJSON(locationJSON);
    return newLocation;
}

/**
 * get name of weekday for provided date
 * @param dateString {string} string formatted 'yyyy-mm-dd hh:mm' defining a date/time
 * @param abbr {boolean} default: false, abbreviate return to first three chars?
 * @returns {string} weekday associated with dateString provided. If abbreviating, only provide first 3 chars
 */
function getWeekdayString(dateString, abbr = false) {
    let dt = new Date(dateString);
    let weekday = dt.getDay();
    let retVal = "";
    switch (weekday){
        case 0:
            retVal = "Sunday";
            break;
        case 1:
            retVal = "Monday";
            break;
        case 2:
            retVal = "Tuesday";
            break;
        case 3:
            retVal = "Wednesday";
            break;
        case 4:
            retVal = "Thursday";
            break;
        case 5:
            retVal = "Friday";
            break;
        case 6:
            retVal = "Saturday";
            break;
    }
    if (abbr){
        retVal = retVal.slice(0, 3);
    }
    return retVal;
}

/**
 * get the maxtemp or mintemp for a forecastday json object provided by weatherAPI (F or C based on global var)
 * @param maxTemp {boolean} true: get maxtemp, false: get mintemp of day's forecast
 * @param forecastdayJSON {object} data for day's forecast provided by weatherAPI
 * @returns {number} integer floored or ceilinged based on max or min temp of day's forecast
 */
function getForecastTemp(maxTemp, forecastdayJSON){
    if (maxTemp){
        if (temperatureUnit === "f"){
            return Math.ceil(forecastdayJSON.maxtemp_f);
        }
        else {
            return Math.ceil(forecastdayJSON.maxtemp_c);
        }
    }
    else {
        if (temperatureUnit === "f"){
            return Math.floor(forecastdayJSON.mintemp_f);
        }
        else {
            return Math.floor(forecastdayJSON.mintemp_c);
        }
    }
}

/**
 * get the current temperature (F or C based on global var)
 * @param currentJSON {object} data for current weather data provided by weatherAPI
 * @returns {number} integer rounded from temperature of current weather
 */
function getMomentaryTemp(currentJSON){
    if (temperatureUnit === "f"){
        return Math.round(currentJSON.temp_f);
    }
    else {
        return Math.round(currentJSON.temp_c);
    }
}

/**
 * get the daily chance of rain or chance of snow (higher value) for a forecastday json object provided
 * by weatherAPI
 * @param forecastdayJSON {object} data for day's forecast provided by weatherAPI
 * @returns {number} integer(rounded) based on max of daily chance of rain or daily chance of snow
 */
function getForecastChanceOfPrecipitation(forecastdayJSON){
    return Math.max(Math.round(forecastdayJSON.daily_chance_of_rain),
        Math.round(forecastdayJSON.daily_chance_of_snow));
}

/**
 * get a string that defines a linear gradient for the background image style of an html element
 * clear days: blue, overcast: gray, precipitation: purple
 * @param code {number} condition code of current or forecastday provided by weatherAPI
 * @returns {string} string that defines background-image style of an html element
 */
function getBackgroundImageString(code){
    switch (code) {
        case 1000:
            return "linear-gradient(deepskyblue, white)";
        case 1003:
        case 1006:
        case 1009:
            return "linear-gradient(gray, white)";
        default:
            return "linear-gradient(purple, white)";
    }
}

/**
 * creates spans for certain elements of a forecastday provided by weatherAPI and appends them to the body
 * as a child div with class "forecast-weather-day-snapshot"
 * @param body {HTMLElement} div element to append snapshot to
 * @param forecastDay {object} forecastday provided by weatherAPI
 */
function addSnapshotElements(body, forecastDay){
    let spanTempDay = document.createElement("span");
    let spanTempNight = document.createElement("span");
    let spanPrec = document.createElement("span");

    spanTempDay.innerHTML = "High: " + getForecastTemp(true, forecastDay.day) + getTempSuffix();
    spanTempNight.innerHTML = "Low: " + getForecastTemp(false, forecastDay.day) + getTempSuffix();
    spanPrec.innerHTML = "Prec: " + getForecastChanceOfPrecipitation(forecastDay.day) + "%";
    spanPrec.title = "Chance of precipitation for the day."

    let divSnapshot = document.createElement("div");
    divSnapshot.className = "forecast-weather-day-snapshot";

    divSnapshot.appendChild(spanTempDay);
    divSnapshot.appendChild(spanTempNight);
    divSnapshot.appendChild(spanPrec);
    body.appendChild(divSnapshot);
}

/**
 * create a div with all the required elements to display the data provided
 * @param forecastDay {object} processed data from the weatherAPI in the format of a forecastday
 * @param flexDirection {String} default: "column"; options: {"column", "row"}; direction of ForecastDaySummary
 * @returns {HTMLDivElement} div with images and text necessary to display a summary of the forecast for a day
 */
function createForecastDaySummary(forecastDay, flexDirection = "column"){
    let body = document.createElement("div");
    body.className = "forecast-weather-day";
    let divImage = document.createElement("div");
    divImage.style.flexDirection = "column";
    let spanWeekday = document.createElement("span");
    spanWeekday.className = "forecast-weather-day-title";
    spanWeekday.innerHTML = getWeekdayString(forecastDay.hour[0].time, true);
    let image = document.createElement("img");
    image.src = "https://" + forecastDay.day.condition.icon;
    image.width = 48;
    image.height = 48;
    image.alt=" N / A ";
    divImage.appendChild(spanWeekday);
    divImage.appendChild(image);

    body.appendChild(divImage);
    addSnapshotElements(body, forecastDay);
    body.style.flexDirection = flexDirection;
    if (flexDirection === "row"){
        body.style.minWidth = "180px";
        body.style.justifyContent = "space-around";
    }
    return body;
}

/**
 * create and return div holding the title for the forecast hour body that labels all the columns appropriately
 * @returns {HTMLDivElement} div element with all the titles for the columns in a forecast hour summary
 */
function createForecastHourTitle(){
    let body = document.createElement("div");
    body.className = "forecast-weather-hour";
    let divHourTitle = document.createElement("div");
    divHourTitle.innerHTML = "Time";
    let divHourTemp = document.createElement("div");
    divHourTemp.innerHTML = "Temp";
    let divHourCondition = document.createElement("div");
    divHourCondition.innerHTML = "Condition";
    let divHourChanceOfPrecipitation = document.createElement("div");
    divHourChanceOfPrecipitation.innerHTML = "Prec %";
    let divHourWindSpeed = document.createElement("div");
    divHourWindSpeed.innerHTML = "Wind";

    body.appendChild(divHourTitle);
    body.appendChild(divHourTemp);
    body.appendChild(divHourCondition);
    body.appendChild(divHourChanceOfPrecipitation);
    body.appendChild(divHourWindSpeed);
    body.style.fontWeight = "600";

    return body;
}

/**
 * create a div that displays all the information necessary for a summary of the forecast in data provided
 * @param forecastHour {object} processed JSON object provided by the weatherAPI depicting weather for the defined hour
 * @returns {HTMLDivElement} div element holding all the images and text populated with data provided
 */
function createForecastHourSummary(forecastHour){
    // create a body div to hold all the other elements
    let body = document.createElement("div");
    body.className = "forecast-weather-hour";

    // timestamp for the hour and temperature
    let divHourTitle = document.createElement("div");
    divHourTitle.innerHTML = getHourString(forecastHour.time);
    let divHourTemp = document.createElement("div");
    divHourTemp.innerHTML = getMomentaryTemp(forecastHour) + getTempSuffix();

    // create a condition div that will hold the weather icon and text description
    let divHourCondition = document.createElement("div");
    let conditionImage = document.createElement("img");
    conditionImage.src = "https://" + forecastHour.condition.icon;
    conditionImage.className = "forecast-weather-hour-condition-image";
    conditionImage.width = 48;
    conditionImage.height = 48;
    conditionImage.alt=" N/A ";
    let conditionText = document.createElement("span");
    conditionText.innerHTML = forecastHour.condition.text;
    divHourCondition.appendChild(conditionImage);
    divHourCondition.appendChild(conditionText);
    divHourCondition.style.flexDirection = "column";
    divHourCondition.style.width = "110px";
    divHourCondition.style.textAlign = "center";

    // div holding chance of precipitation and div holding wind speed
    let divHourChanceOfPrecipitation = document.createElement("div");
    divHourChanceOfPrecipitation.innerHTML = getMomentaryChanceOfPrecipitation(forecastHour) + "%";
    let divHourWindSpeed = document.createElement("div");
    divHourWindSpeed.innerHTML = getMomentaryWindSpeed(forecastHour) + " " + getWindSpeedSuffix();

    // append all the elements to the body
    body.appendChild(divHourTitle);
    body.appendChild(divHourTemp);
    body.appendChild(divHourCondition);
    body.appendChild(divHourChanceOfPrecipitation);
    body.appendChild(divHourWindSpeed);

    return body;
}

/**
 * get the wind speed from a momentary JSON object provided by the weatherAPI and return in mph or kph based on
 * global temperatureUnit variable
 * @param momentaryJSON {object} momentary JSON object provided by the weatherAPI (either the current data or
 * the hour data that is a part of a forecastday)
 * @returns {number} returns rounded integer that is wind speed in mph or kph
 */
function getMomentaryWindSpeed(momentaryJSON){
    if (temperatureUnit === "f"){
        return Math.round(momentaryJSON.wind_mph);
    }
    else {
        return Math.round(momentaryJSON.wind_kph);
    }
}

/**
 * get the greatest of chance_of_rain and chance_of_snow from a momentary JSON object provided by the weatherAPI
 * @param momentaryJSON {object} momentary JSON object provided by the weatherAPI (either the current data or
 * the hour data that is a part of a forecastday)
 * @returns {number} returns rounded integer of either 'chance of rain' or 'chance of snow' (whichever is higher)
 */
function getMomentaryChanceOfPrecipitation(momentaryJSON){
    return Math.max(Math.round(momentaryJSON.chance_of_rain), Math.round(momentaryJSON.chance_of_snow));
}

// TODO - find a more robust method to get the time from the datetime string
/**
 * get the time from a datetime string provided by the weatherAPI
 * @param timeString {string} datetime string provided by the weatherAPI (labeled just as "time" in JSON object)
 * @returns {string}
 */
function getHourString(timeString){
    return timeString.slice(-5).toString();
}

/**
 * handles enabling and disabling the refresh location button
 * if there is no current location this should be disabled
 * @param enable {boolean} defaults: true; true: enable the button, false: disable the button
 */
function enableRefreshButton(enable = true){
    if (enable) {
        btnRefresh.disabled = false;
        btnRefresh.classList.add("refresh-button-effects");
    }
    else {
        btnRefresh.disabled = true;
        btnRefresh.classList.remove("refresh-button-effects");
    }
}

/**
 * handle resizing all the elements in the window
 */
function onWindowResize(){
    let width = window.innerWidth;
    if (width < 600){
        document.getElementById("txtSiteName").style.display = "none";
        document.getElementById("inputLocation").style.fontSize = ".8rem";
    }
    else {
        document.getElementById("txtSiteName").style.display = "block";
        document.getElementById("inputLocation").style.fontSize = "1rem";
    }
}

/**
 * display or hide loading text and associated weather elements depending on provided parameter
 * handles necessary formatting that accompanies hiding/displaying elements
 * @param loading {boolean} default: true; true: display loading text and hide weather elements,
 * false: hide loading text and display all the weather elements
 */
function displayLoading(loading = true){
    // get all the elements necessary
    let divCurrentWeather = document.getElementById("divCurrentWeather");
    let divCurrentWeatherWrapper = document.getElementById("divCurrentWeatherWrapper");
    let divForecastWeather = document.getElementById("divForecastWeather");
    let divHourlyWeather = document.getElementById("divHourlyWeather");
    let divLocationHeader = document.getElementById("divLocationHeader");
    let divUserInformation = document.getElementById("divUserInformationDisplay");
    let txtUserInformation = document.getElementById("txtUserInformation");

    // reset the text to loading in case it has been changed
    txtUserInformation.innerHTML = "Loading...";
    if (loading) {
        // hide all the weather bodies and display just the loading card
        document.getElementById("txtCurrentWeatherHeader").innerHTML = "";
        // give a margin to the loading card to accommodate the missing location name
        divCurrentWeather.style.marginTop = "55px";
        divCurrentWeatherWrapper.style.display = "none";
        divForecastWeather.style.display = "none";
        divHourlyWeather.style.display = "none";
        divLocationHeader.style.display = "none";
        divUserInformation.style.display = "flex";
    }
    else {
        // display everything associated with the weather display
        divCurrentWeather.style.marginTop = "0px";
        divCurrentWeatherWrapper.style.display = "flex";
        divForecastWeather.style.display = "flex";
        divHourlyWeather.style.display = "flex";
        divLocationHeader.style.display = "flex";
        divUserInformation.style.display = "none";
    }
}

/**
 * if there are any errors in the formatting, display the warning symbol and add information in the title to inform
 * the user when they hover over the image
 * @param errors {String[]} array of strings describing any errors in the formatting of the response from the weatherAPI
 */
function displayErrors(errors = []){
    console.log(errors);
    let imgWarning = document.getElementById("imgErrorWarning");
    if (errors.length <= 0){
        imgWarning.style.display = "none";
    }
    else {
        imgWarning.style.display = "block";
        let warningText = "Information Missing from Location:";
        for (let error of errors){
            warningText = warningText + "\n" + error;
        }
        imgWarning.title = warningText;
    }
}

/**
 * check with the WeatherHandler to see if it is free for another query or is already busy waiting for one
 * @returns {boolean} true: free to query for weather, false: waiting for another query
 */
function freeToQuery(){
    if (weather !== null)
        return weather.isFreeToQuery();
    else
        return false;
}

/**
 * this starts the function that animates forecast elements on the page after loading the data
 */
function animateForecastElements(){
    requestAnimationFrame(moveForecastElements.bind(null, Date.now()));
}

/**
 * handle moving the forecast elements based on the time since animation was first initiated.
 * @param initTime {number} timestamp, in ms, when the animation was first initiated
 */
function moveForecastElements(initTime){
    let forecastDayBody = document.getElementById("divForecastWeather");
    let forecastHourBody = document.getElementById("divHourlyWeather");

    let timeSpan = 500;
    let percentRemaining = ((timeSpan - (Date.now() - initTime))/timeSpan);
    if (percentRemaining < 0) percentRemaining = 0;
    let dayHeight = forecastDayBody.offsetHeight;

    // move the forecast day divs
    for (let i = 0; i < forecastDayBody.childElementCount; i++){
        let element = forecastDayBody.children[i];
        element.style.top = (-1 * (dayHeight * (percentRemaining * (1 + (i * .2))))) + 'px';
    }

    // move the forecast hour divs
    for (let i = 1; i < 25; i++){
        let element = forecastHourBody.children[i];
        element.style.left = '-' + (percentRemaining * (100 + (i*5))) + '%';
    }

    // continue the animation if there is any percent remaining
    if (percentRemaining > 0) {
        requestAnimationFrame(moveForecastElements.bind(null, initTime));
    }
}
