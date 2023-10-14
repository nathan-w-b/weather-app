const weatherAddress = "http://api.weatherapi.com/v1/";
const weatherKey = "?key=a8bf3bd8dbd84fb88f6223727232308"

/**
 * class that handles all the communicating with the weatherAPI
 */
class WeatherHandler {
    constructor(forecastDays, testing = false) {
        this.waitingForSearchResponse = false;
        this.waitingForWeatherResponse = false;
        // TODO - implement fake queries to weatherAPI for unit testing
        this.forecastDays = forecastDays;
        this.testing = testing;
    }

    /**
     * query if WeatherHandler is currently waiting for a search or weather query to respond
     * @returns {boolean} true: available to search, false: not available
     */
    isFreeToSearch(){
        return (!this.waitingForSearchResponse && !this.waitingForWeatherResponse);
    }

    /**
     * query if WeatherHandler is currently waiting for a weather query to respond
     * @returns {boolean} true: available to query for weather, false: not available
     */
    isFreeToQuery(){
        return (!this.waitingForWeatherResponse)
    }

    /**
     * send a request for either locations or weather data to the weatherAPI
     * @param type {String} define the type of search to send
     * @param location {LocationData, String} location to get weather data for or string of location to search for
     * @param requestSuccessFunction {function} function to be performed on successful query to weatherAPI
     * inputs to function are (processedResponse, errors found in formatting)
     * @param requestFailFunction {function} function to be run on failed query to weatherAPI
     */
    requestWeather(type, location, requestSuccessFunction, requestFailFunction) {
        let address = "";
        // get the properly formatted address to send to the weatherAPI
        switch (type){
            case "current":
                address = weatherAddress + "current.json" +
                    weatherKey + "&q=" + location.getSearchString() + "&aqi=no";
                break;
            case "forecast":
                address = weatherAddress + "forecast.json" +
                    weatherKey + "&q=" + location.getSearchString() + "&days=" + (this.forecastDays + 1) + "&aqi=no";
                break;
            case "search":
                address = weatherAddress + "search.json" +
                    weatherKey + "&q=" + location;
                break;
            default:
                console.log("Error-WeatherHandler: Query Type not supported.");
                break;
        }
        // store that a response is being waited for
        this.triggerWaitingForResponse(type, true);
        // send the request to the weatherAPI
        if (!this.testing) {
            $.get(address)
                .done(this.jqueryResponseDone.bind(this, type, requestSuccessFunction))
                .fail(this.jqueryResponseFail.bind(this, type, requestFailFunction));
        }
        else {
            this.jqueryResponseDone(type, requestSuccessFunction, WeatherHandler.getTestData(this.forecastDays));
        }
    }

    /**
     * handle setting variables that store whether WeatherHandler is waiting for query responses or not
     * @param type {string} type of query (search, current, forecast)
     * @param waiting {boolean} defaults: false; true: waiting for query, false: free up for another query
     */
    triggerWaitingForResponse(type, waiting = false){
        switch (type){
            case "current":
                this.waitingForWeatherResponse = waiting;
                break;
            case "forecast":
                this.waitingForWeatherResponse = waiting;
                break;
            case "search":
                this.waitingForSearchResponse = waiting;
                break;
            default:
                console.log("Error-WeatherHandler: Query Type not supported.");
                break;
        }
    }

    /**
     * function to be run if successful get from weatherAPI
     * @param type {String} type of query sent to weatherAPI
     * @param requestSuccessFunction {function} function to run after successful query
     * @param response {object} json object sent by weatherAPI
     */
    jqueryResponseDone(type, requestSuccessFunction, response){
        // if successful, process the response and send it to the success function with any errors in formatting
        console.log("Weather Request Success");
        this.triggerWaitingForResponse(type, false);
        if (requestSuccessFunction != null) {
            let errors = [];
            console.log(response);
            let processedResponse = WeatherHandler.processResponse(response, type, this.forecastDays, errors);
            console.log(processedResponse);
            requestSuccessFunction(processedResponse, errors);
        } else {
            console.log("Error-WeatherHandler: No request success function provided.");
        }
    }

    /**
     * function to be run upon failure to get from weatherAPI
     * @param type {String} type of query sent to weatherAPI
     * @param requestFailFunction {function} function to run after failed query
     */
    jqueryResponseFail(type, requestFailFunction){
        // if failed, send the failed function out
        console.log("Weather Request failed");
        this.triggerWaitingForResponse(type, false);
        if (requestFailFunction != null) {
            requestFailFunction();
        } else {
            console.log("Error-WeatherHandler: No request fail function provided.");
        }
    }

    /**
     * process the response based on the query type made to the weatherAPI
     * @param response raw response from the weatherAPI
     * @param type type of query sent to the weatherAPI
     * @param forecastDays {number} integer defining number of days expected to see in forecast
     * @param errors {String[]} string of errors on any improperly formatted data
     * @returns {{current: {wind_kph: number, last_updated: string,
     * condition: {code: number, icon: string, text: string},
     * wind_mph: number, is_day: number, temp_c: number, temp_f: number}, location: {localtime: string,
     * country: string, name: string, region: string}, forecast: {forecastday: *[]}}}
     */
    static processResponse(response, type, forecastDays, errors){
        let processedResponse = WeatherHandler.getEmptyCurrentJSON();
        switch (type) {
            case "current":
                WeatherHandler.addCurrentData(response, processedResponse, errors);
                break;
            case "forecast":
                WeatherHandler.addCurrentData(response, processedResponse, errors);
                WeatherHandler.addForecastData(response, processedResponse, forecastDays, errors);
                break;
            case "search":
                processedResponse = [];
                WeatherHandler.addSearchData(response, processedResponse, errors);
                break;
        }
        return processedResponse;
    }

    /**
     * add the current weather data from the raw response of the weatherAPI into the processed JSON object
     * @param responseJSON raw response from the weatherAPI
     * @param processedJSON processed JSON object that holds all the data needed from the weatherAPI
     * @param errors {String[]} array of strings describing data improperly formatted in the raw response
     */
    static addCurrentData(responseJSON, processedJSON, errors){
        // add location data
        if ('location' in responseJSON) {
            for(let key in processedJSON.location){
                if (key in responseJSON.location) processedJSON.location[key] = responseJSON.location[key];
                else errors.push("location." + key);
            }
        }
        else {
            errors.push("location");
        }
        // add current data
        if ('current' in responseJSON) {
            for(let key in processedJSON.current){
                if (key in responseJSON.current) processedJSON.current[key] = responseJSON.current[key];
                else errors.push("current." + key);
            }
            if ('condition' in responseJSON.current){
                for (let key in processedJSON.current.condition){
                    if(key in responseJSON.current.condition) processedJSON.current.condition[key] = responseJSON.current.condition[key];
                    else errors.push("current.condition." + key);
                }
            }
            else {
                errors.push("current.condition");
            }
        }
        else {
            errors.push("current");
        }
    }

    /**
     * add the forecastday and forecast hour weather data from the raw response of the weatherAPI
     * into the processed JSON object
     * @param responseJSON raw response from the weatherAPI
     * @param processedJSON processed JSON object that holds all the data needed from the weatherAPI
     * @param forecastDays {number} number of forecast days expected in query
     * @param errors {String[]} array of strings describing data improperly formatted in the raw response
     */
    static addForecastData(responseJSON, processedJSON, forecastDays, errors){
        let errorImproperFormat = false;
        // check to see if everything is properly formatted up to the array of forecast days
        if ('forecast' in responseJSON) {
            if ('forecastday' in responseJSON.forecast){
                if (!Array.isArray(responseJSON.forecast.forecastday))
                    errorImproperFormat = true;
            }
            else errorImproperFormat = true;
        }
        else errorImproperFormat = true;
        // iterate through X num of forecast days and if improperly formatted or not enough forecast days, insert dummy
        if (!errorImproperFormat) {
            let missingDays = (forecastDays + 1) - responseJSON.forecast.forecastday.length;
            if (missingDays > 0)
                errors.push("Missing " + missingDays + " forecast days of data.");
            for (let i = 0; i < (responseJSON.forecast.forecastday.length); i++) {
                // init currentDay or push a dummy day if valid data not available
                let currentDay = responseJSON.forecast.forecastday[i];

                // init processed day to be pushed onto processed json at end
                let processedDay = WeatherHandler.getEmptyForecastDayJSON();

                // date
                if ('date' in currentDay) processedDay.date = currentDay.date;
                else errors.push("Forecast of day " + i + " is missing date.");

                // day
                if ('day' in currentDay) {
                    for (let key in processedDay.day) {
                        if (key in currentDay.day) processedDay.day[key] = currentDay.day[key];
                        else errors.push("Forecast of day " + i + " is missing " + key + ".");
                    }
                    // condition
                    if ('condition' in currentDay.day) {
                        for (let key in processedDay.day.condition) {
                            if (key in currentDay.day.condition)
                                processedDay.day.condition[key] = currentDay.day.condition[key];
                            else errors.push("Forecast of day " + i + " is missing condition." + key + ".");
                        }
                    }
                } else errors.push("Forecast of day " + i + " is missing data.");

                // hours
                let errorImproperHourFormat = false;
                if ('hour' in currentDay) {
                    if (!Array.isArray(currentDay.hour)) errorImproperHourFormat = true;
                } else errorImproperHourFormat = true;

                let errorMissingHourData = false;
                for (let hour = 0; hour < 24; hour++) {
                    let forecastHour = WeatherHandler.getEmptyForecastHourJSON();
                    if (!errorImproperHourFormat && hour < currentDay.hour.length) {
                        for (let key in forecastHour) {
                            if (key in currentDay.hour[hour]) forecastHour[key] = currentDay.hour[hour][key];
                            else errorMissingHourData = true;
                        }
                        if ('condition' in currentDay.hour[hour]) {
                            for (let key in forecastHour.condition) {
                                if (key in currentDay.hour[hour].condition)
                                    forecastHour.condition[key] = currentDay.hour[hour].condition[key];
                                else errorMissingHourData = true;
                            }
                        }
                    }
                    processedDay.hour.push(forecastHour);
                    if (errorMissingHourData) errors.push("Forecast of day " + i + " is missing hour data.");
                }
                // add processed day to processed JSON
                processedJSON.forecast.forecastday.push(processedDay);
            }
        }
        // add error to array if improperly formatted
        else {
            errors.push("Improperly Formatted Forecast Data.");
        }
//      errors.push("Forecast is missing " + ((forecastDays + 1) - responseJSON.forecast.forecastday.length) + " days.");
    }

    /**
     * process all the JSON objects from the weatherAPI location search and output an array of LocationData
     * @param responseJSON {object[]} array of JSON objects from weatherAPI location search
     * @param processedJSON {LocationData[]} array of LocationData processed from responseJSON from weatherAPI
     * @param errors {String[]} errors provided with any errors found in the responseJSON formatting
     */
    static addSearchData(responseJSON, processedJSON, errors){
        let errorInSearchResultFormatting = false;
        if (Array.isArray(responseJSON)){
            if (responseJSON.length > 0){
                for (let searchResult of responseJSON){
                    let newLocation = new LocationData();
                    if (newLocation.updateFromJSON(searchResult))
                        errorInSearchResultFormatting = true;
                    processedJSON.push(newLocation);
                }
            }
            else {
                errors.push("No Cities Found.");
            }
        }
        else {
            errors.push("Query Response improperly formatted.");
        }
        if (errorInSearchResultFormatting) errors.push("Error in a Search Result Formatting.");
    }

    /**
     * get a properly formatted empty current weather object with all the keys needed
     * @returns {{current: {wind_kph: number, last_updated: string,
     * condition: {code: number, icon: string, text: string},
     * wind_mph: number, is_day: number, temp_c: number, temp_f: number},
     * location: {localtime: string, country: string, name: string, region: string}, forecast: {forecastday: *[]}}}
     */
    static getEmptyCurrentJSON(){
        return {
            "location": {
                "name": "",
                "region": "",
                "country": "",
                "localtime": ""
            },
            "current": {
                "last_updated": "",
                "temp_c": NaN,
                "temp_f": NaN,
                "is_day": NaN,
                "condition": {
                    "text": "",
                    "icon": "",
                    "code": NaN
                },
                "wind_mph": NaN,
                "wind_kph": NaN
            },
            "forecast": {
                "forecastday": [
                ]
            }
        }
    }

    /**
     * get a properly formatted empty forecastday object with all the keys needed
     * @returns {{date: string, hour: *[], day: {avgtemp_f: number, avgtemp_c: number, daily_chance_of_snow: number,
     * maxtemp_c: number, maxtemp_f: number, mintemp_c: number, daily_will_it_rain: number, mintemp_f: number,
     * condition: {code: number, icon: string, text: string}, maxwind_kph: number, maxwind_mph: number,
     * daily_chance_of_rain: number, daily_will_it_snow: number}}}
     */
    static getEmptyForecastDayJSON() {
        return {
            "date": "",
            "day": {
                "maxtemp_c": NaN,
                "maxtemp_f": NaN,
                "mintemp_c": NaN,
                "mintemp_f": NaN,
                "avgtemp_c": NaN,
                "avgtemp_f": NaN,
                "maxwind_mph": NaN,
                "maxwind_kph": NaN,
                "daily_will_it_rain": NaN,
                "daily_chance_of_rain": NaN,
                "daily_will_it_snow": NaN,
                "daily_chance_of_snow": NaN,
                "condition": {
                    "text": "",
                    "icon": "",
                    "code": NaN
                }
            },
            "hour": [

            ]
        }
    }

    /**
     * get a properly formatted empty forecast hour object with all the keys needed
     * @returns {{will_it_rain: number, wind_kph: number, condition: {code: number, icon: string, text: string},
     * wind_mph: number, will_it_snow: number, humidity: number, time: string, temp_c: number, chance_of_snow: number,
     * chance_of_rain: number, temp_f: number}}
     */
    static getEmptyForecastHourJSON() {
        return {
            "time": "",
            "temp_c": NaN,
            "temp_f": NaN,
            "condition": {
                "text": "",
                "icon": "",
                "code": NaN
            },
            "wind_mph": NaN,
            "wind_kph": NaN,
            "humidity": NaN,
            "will_it_rain": NaN,
            "chance_of_rain": NaN,
            "will_it_snow": NaN,
            "chance_of_snow": NaN
        }
    }

    /**
     * get an empty forecastday with 24 empty forecast hours
     * @returns {{date: string, hour: *[], day: {avgtemp_f: number, avgtemp_c: number, daily_chance_of_snow: number,
     * maxtemp_c: number, maxtemp_f: number, mintemp_c: number, daily_will_it_rain: number, mintemp_f: number,
     * condition: {code: number, icon: string, text: string}, maxwind_kph: number, maxwind_mph: number,
     * daily_chance_of_rain: number, daily_will_it_snow: number}}}
     */
    static getDummyForecastDayJSON(){
        let retVal = WeatherHandler.getEmptyForecastDayJSON()
        for (let i = 0; i < 24; i++){
            retVal.hour.push(WeatherHandler.getEmptyForecastHourJSON());
        }
        return retVal;
    }

    /**
     * get a test JSON object that is a format expected from weatherAPI
     * @param numForecastDays {number} default: 6; build a test json object to come from weatherAPI
     * @returns {{current: {feelslike_c: number, uv: number, last_updated: string, feelslike_f: number, wind_degree: number, last_updated_epoch: number, is_day: number, precip_in: number, wind_dir: string, gust_mph: number, temp_c: number, pressure_in: number, gust_kph: number, temp_f: number, precip_mm: number, cloud: number, wind_kph: number, condition: {code: number, icon: string, text: string}, wind_mph: number, vis_km: number, humidity: number, pressure_mb: number, vis_miles: number}, location: {localtime: string, country: string, localtime_epoch: number, name: string, lon: number, region: string, lat: number, tz_id: string}, forecast: {forecastday: *[]}}}
     */
    static getTestData(numForecastDays = 6) {
        let datePreString = "2023-09-"
        let retVal =
        {
            "location": {
            "name": "Yarmouth",
                "region": "Maine",
                "country": "United States of America",
                "lat": 43.8,
                "lon": -70.19,
                "tz_id": "America/New_York",
                "localtime_epoch": 1694386898,
                "localtime": "2023-09-01 19:01"
        },
            "current": {
            "last_updated_epoch": 1694386800,
                "last_updated": "2023-09-01 19:00",
                "temp_c": 18.3,
                "temp_f": 64.9,
                "is_day": 0,
                "condition": {
                "text": "Light rain",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/296.png",
                    "code": 1183
            },
            "wind_mph": 2.2,
                "wind_kph": 3.6,
                "wind_degree": 10,
                "wind_dir": "N",
                "pressure_mb": 1020,
                "pressure_in": 30.13,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 100,
                "cloud": 100,
                "feelslike_c": 18.3,
                "feelslike_f": 64.9,
                "vis_km": 11,
                "vis_miles": 6,
                "uv": 4,
                "gust_mph": 3.1,
                "gust_kph": 5
        },
            "forecast": {
            "forecastday": [
            ]
        }
        };

        for (let i = 0; i < numForecastDays + 1; i++){
            let dateString = datePreString + (i + 1);
            retVal.forecast.forecastday.push(this.getTestDay(dateString));
        }
        return retVal;
    }

    /**
     * get an example json object that is expected from weatherAPI
     * @param date {String} date as a string "yyyy-mm-dd"
     * @returns {{date, astro: {moonset: string, moon_illumination: string, sunrise: string, moon_phase: string, sunset: string, is_moon_up: number, is_sun_up: number, moonrise: string}, date_epoch: number, hour: [{feelslike_c: number, feelslike_f: number, wind_degree: number, windchill_f: number, windchill_c: number, temp_c: number, temp_f: number, cloud: number, wind_kph: number, wind_mph: number, humidity: number, dewpoint_f: number, will_it_rain: number, uv: number, heatindex_f: number, dewpoint_c: number, is_day: number, precip_in: number, heatindex_c: number, wind_dir: string, gust_mph: number, pressure_in: number, chance_of_rain: number, gust_kph: number, precip_mm: number, condition: {code: number, icon: string, text: string}, will_it_snow: number, vis_km: number, time_epoch: number, time: string, chance_of_snow: number, pressure_mb: number, vis_miles: number},{feelslike_c: number, feelslike_f: number, wind_degree: number, windchill_f: number, windchill_c: number, temp_c: number, temp_f: number, cloud: number, wind_kph: number, wind_mph: number, humidity: number, dewpoint_f: number, will_it_rain: number, uv: number, heatindex_f: number, dewpoint_c: number, is_day: number, precip_in: number, heatindex_c: number, wind_dir: string, gust_mph: number, pressure_in: number, chance_of_rain: number, gust_kph: number, precip_mm: number, condition: {code: number, icon: string, text: string}, will_it_snow: number, vis_km: number, time_epoch: number, time: string, chance_of_snow: number, pressure_mb: number, vis_miles: number},{feelslike_c: number, feelslike_f: number, wind_degree: number, windchill_f: number, windchill_c: number, temp_c: number, temp_f: number, cloud: number, wind_kph: number, wind_mph: number, humidity: number, dewpoint_f: number, will_it_rain: number, uv: number, heatindex_f: number, dewpoint_c: number, is_day: number, precip_in: number, heatindex_c: number, wind_dir: string, gust_mph: number, pressure_in: number, chance_of_rain: number, gust_kph: number, precip_mm: number, condition: {code: number, icon: string, text: string}, will_it_snow: number, vis_km: number, time_epoch: number, time: string, chance_of_snow: number, pressure_mb: number, vis_miles: number},{feelslike_c: number, feelslike_f: number, wind_degree: number, windchill_f: number, windchill_c: number, temp_c: number, temp_f: number, cloud: number, wind_kph: number, wind_mph: number, humidity: number, dewpoint_f: number, will_it_rain: number, uv: number, heatindex_f: number, dewpoint_c: number, is_day: number, precip_in: number, heatindex_c: number, wind_dir: string, gust_mph: number, pressure_in: number, chance_of_rain: number, gust_kph: number, precip_mm: number, condition: {code: number, icon: string, text: string}, will_it_snow: number, vis_km: number, time_epoch: number, time: string, chance_of_snow: number, pressure_mb: number, vis_miles: number},{feelslike_c: number, feelslike_f: number, wind_degree: number, windchill_f: number, windchill_c: number, temp_c: number, temp_f: number, cloud: number, wind_kph: number, wind_mph: number, humidity: number, dewpoint_f: number, will_it_rain: number, uv: number, heatindex_f: number, dewpoint_c: number, is_day: number, precip_in: number, heatindex_c: number, wind_dir: string, gust_mph: number, pressure_in: number, chance_of_rain: number, gust_kph: number, precip_mm: number, condition: {code: number, icon: string, text: string}, will_it_snow: number, vis_km: number, time_epoch: number, time: string, chance_of_snow: number, pressure_mb: number, vis_miles: number},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null], day: {avgvis_km: number, uv: number, avgtemp_f: number, avgtemp_c: number, daily_chance_of_snow: number, maxtemp_c: number, maxtemp_f: number, mintemp_c: number, avgvis_miles: number, daily_will_it_rain: number, mintemp_f: number, totalprecip_in: number, totalsnow_cm: number, avghumidity: number, condition: {code: number, icon: string, text: string}, maxwind_kph: number, maxwind_mph: number, daily_chance_of_rain: number, totalprecip_mm: number, daily_will_it_snow: number}}}
     */
    static getTestDay(date) {
        return {
            "date": date,
            "date_epoch": 1694476800,
            "day": {
            "maxtemp_c": 19.8,
                "maxtemp_f": 67.6,
                "mintemp_c": 15.5,
                "mintemp_f": 59.9,
                "avgtemp_c": 17.3,
                "avgtemp_f": 63.1,
                "maxwind_mph": 8.9,
                "maxwind_kph": 14.4,
                "totalprecip_mm": 1,
                "totalprecip_in": 0.04,
                "totalsnow_cm": 0,
                "avgvis_km": 5.7,
                "avgvis_miles": 3,
                "avghumidity": 95,
                "daily_will_it_rain": 1,
                "daily_chance_of_rain": 84,
                "daily_will_it_snow": 0,
                "daily_chance_of_snow": 0,
                "condition": {
                "text": "Patchy rain possible",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/176.png",
                    "code": 1063
            },
            "uv": 4
        },
            "astro": {
            "sunrise": "06:16 AM",
                "sunset": "06:57 PM",
                "moonrise": "03:31 AM",
                "moonset": "06:22 PM",
                "moon_phase": "Waning Crescent",
                "moon_illumination": "8",
                "is_moon_up": 0,
                "is_sun_up": 0
        },
            "hour": [
            {
                "time_epoch": 1694491200,
                "time": date + " 00:00",
                "temp_c": 18.7,
                "temp_f": 65.7,
                "is_day": 0,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/122.png",
                    "code": 1009
                },
                "wind_mph": 4.9,
                "wind_kph": 7.9,
                "wind_degree": 81,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 93,
                "cloud": 100,
                "feelslike_c": 18.7,
                "feelslike_f": 65.7,
                "windchill_c": 18.7,
                "windchill_f": 65.7,
                "heatindex_c": 18.7,
                "heatindex_f": 65.7,
                "dewpoint_c": 17.5,
                "dewpoint_f": 63.5,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 7.8,
                "gust_kph": 12.6,
                "uv": 1
            },
            {
                "time_epoch": 1694494800,
                "time": date + " 01:00",
                "temp_c": 18.3,
                "temp_f": 64.9,
                "is_day": 0,
                "condition": {
                    "text": "Mist",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/143.png",
                    "code": 1030
                },
                "wind_mph": 6,
                "wind_kph": 9.7,
                "wind_degree": 80,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.08,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 96,
                "cloud": 100,
                "feelslike_c": 18.3,
                "feelslike_f": 64.9,
                "windchill_c": 18.3,
                "windchill_f": 64.9,
                "heatindex_c": 18.3,
                "heatindex_f": 64.9,
                "dewpoint_c": 17.6,
                "dewpoint_f": 63.7,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 9.4,
                "gust_kph": 15.1,
                "uv": 1
            },
            {
                "time_epoch": 1694498400,
                "time": date + " 02:00",
                "temp_c": 17.9,
                "temp_f": 64.2,
                "is_day": 0,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/122.png",
                    "code": 1009
                },
                "wind_mph": 7.6,
                "wind_kph": 12.2,
                "wind_degree": 88,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.05,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 95,
                "cloud": 100,
                "feelslike_c": 17.9,
                "feelslike_f": 64.2,
                "windchill_c": 17.9,
                "windchill_f": 64.2,
                "heatindex_c": 17.9,
                "heatindex_f": 64.2,
                "dewpoint_c": 17.1,
                "dewpoint_f": 62.8,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 0,
                "vis_miles": 0,
                "gust_mph": 11.6,
                "gust_kph": 18.7,
                "uv": 1
            },
            {
                "time_epoch": 1694502000,
                "time": date + " 03:00",
                "temp_c": 17.4,
                "temp_f": 63.3,
                "is_day": 0,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/122.png",
                    "code": 1009
                },
                "wind_mph": 8.5,
                "wind_kph": 13.7,
                "wind_degree": 93,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.07,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 17.4,
                "feelslike_f": 63.3,
                "windchill_c": 17.4,
                "windchill_f": 63.3,
                "heatindex_c": 17.4,
                "heatindex_f": 63.3,
                "dewpoint_c": 17.1,
                "dewpoint_f": 62.8,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 12.8,
                "gust_kph": 20.5,
                "uv": 1
            },
            {
                "time_epoch": 1694505600,
                "time": date + " 04:00",
                "temp_c": 17.1,
                "temp_f": 62.8,
                "is_day": 0,
                "condition": {
                    "text": "Fog",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/248.png",
                    "code": 1135
                },
                "wind_mph": 7.4,
                "wind_kph": 11.9,
                "wind_degree": 91,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.08,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 17.1,
                "feelslike_f": 62.8,
                "windchill_c": 17.1,
                "windchill_f": 62.8,
                "heatindex_c": 17.1,
                "heatindex_f": 62.8,
                "dewpoint_c": 16.8,
                "dewpoint_f": 62.2,
                "will_it_rain": 1,
                "chance_of_rain": 73,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 0,
                "vis_miles": 0,
                "gust_mph": 11,
                "gust_kph": 17.6,
                "uv": 1
            },
            {
                "time_epoch": 1694509200,
                "time": date + " 05:00",
                "temp_c": 16.4,
                "temp_f": 61.5,
                "is_day": 0,
                "condition": {
                    "text": "Cloudy",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/119.png",
                    "code": 1006
                },
                "wind_mph": 7.2,
                "wind_kph": 11.5,
                "wind_degree": 87,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.06,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 92,
                "cloud": 86,
                "feelslike_c": 16.4,
                "feelslike_f": 61.5,
                "windchill_c": 16.4,
                "windchill_f": 61.5,
                "heatindex_c": 16.4,
                "heatindex_f": 61.5,
                "dewpoint_c": 15,
                "dewpoint_f": 59,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 10.7,
                "gust_kph": 17.3,
                "uv": 1
            },
            {
                "time_epoch": 1694512800,
                "time": date + " 06:00",
                "temp_c": 16.8,
                "temp_f": 62.2,
                "is_day": 0,
                "condition": {
                    "text": "Patchy rain possible",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/176.png",
                    "code": 1063
                },
                "wind_mph": 7.8,
                "wind_kph": 12.6,
                "wind_degree": 89,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.08,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 16.8,
                "feelslike_f": 62.2,
                "windchill_c": 16.8,
                "windchill_f": 62.2,
                "heatindex_c": 16.8,
                "heatindex_f": 62.2,
                "dewpoint_c": 16.5,
                "dewpoint_f": 61.7,
                "will_it_rain": 1,
                "chance_of_rain": 82,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 11.6,
                "gust_kph": 18.7,
                "uv": 1
            },
            {
                "time_epoch": 1694516400,
                "time": date + " 07:00",
                "temp_c": 16.8,
                "temp_f": 62.2,
                "is_day": 1,
                "condition": {
                    "text": "Patchy rain possible",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/176.png",
                    "code": 1063
                },
                "wind_mph": 8.7,
                "wind_kph": 14,
                "wind_degree": 93,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 97,
                "cloud": 100,
                "feelslike_c": 16.8,
                "feelslike_f": 62.2,
                "windchill_c": 16.8,
                "windchill_f": 62.2,
                "heatindex_c": 16.8,
                "heatindex_f": 62.2,
                "dewpoint_c": 16.4,
                "dewpoint_f": 61.5,
                "will_it_rain": 1,
                "chance_of_rain": 84,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 12.8,
                "gust_kph": 20.5,
                "uv": 4
            },
            {
                "time_epoch": 1694520000,
                "time": date + " 08:00",
                "temp_c": 15.5,
                "temp_f": 59.9,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 8.5,
                "wind_kph": 13.7,
                "wind_degree": 96,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 92,
                "cloud": 94,
                "feelslike_c": 15.5,
                "feelslike_f": 59.9,
                "windchill_c": 15.5,
                "windchill_f": 59.9,
                "heatindex_c": 15.5,
                "heatindex_f": 59.9,
                "dewpoint_c": 14.2,
                "dewpoint_f": 57.6,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 12.1,
                "gust_kph": 19.4,
                "uv": 4
            },
            {
                "time_epoch": 1694523600,
                "time": date + " 09:00",
                "temp_c": 16.9,
                "temp_f": 62.4,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 8.9,
                "wind_kph": 14.4,
                "wind_degree": 100,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 96,
                "cloud": 100,
                "feelslike_c": 16.9,
                "feelslike_f": 62.4,
                "windchill_c": 16.9,
                "windchill_f": 62.4,
                "heatindex_c": 16.9,
                "heatindex_f": 62.4,
                "dewpoint_c": 16.2,
                "dewpoint_f": 61.2,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 12.3,
                "gust_kph": 19.8,
                "uv": 4
            },
            {
                "time_epoch": 1694527200,
                "time": date + " 10:00",
                "temp_c": 17.2,
                "temp_f": 63,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 8.5,
                "wind_kph": 13.7,
                "wind_degree": 101,
                "wind_dir": "ESE",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 95,
                "cloud": 100,
                "feelslike_c": 17.2,
                "feelslike_f": 63,
                "windchill_c": 17.2,
                "windchill_f": 63,
                "heatindex_c": 17.2,
                "heatindex_f": 63,
                "dewpoint_c": 16.3,
                "dewpoint_f": 61.3,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 11.4,
                "gust_kph": 18.4,
                "uv": 4
            },
            {
                "time_epoch": 1694530800,
                "time": date + " 11:00",
                "temp_c": 19.4,
                "temp_f": 66.9,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 8.5,
                "wind_kph": 13.7,
                "wind_degree": 100,
                "wind_dir": "E",
                "pressure_mb": 1016,
                "pressure_in": 29.99,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 97,
                "cloud": 100,
                "feelslike_c": 19.4,
                "feelslike_f": 66.9,
                "windchill_c": 19.4,
                "windchill_f": 66.9,
                "heatindex_c": 19.4,
                "heatindex_f": 66.9,
                "dewpoint_c": 18.9,
                "dewpoint_f": 66,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 11.6,
                "gust_kph": 18.7,
                "uv": 4
            },
            {
                "time_epoch": 1694534400,
                "time": date + " 12:00",
                "temp_c": 17,
                "temp_f": 62.6,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 8.5,
                "wind_kph": 13.7,
                "wind_degree": 96,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 95,
                "cloud": 100,
                "feelslike_c": 16.9,
                "feelslike_f": 62.4,
                "windchill_c": 16.9,
                "windchill_f": 62.4,
                "heatindex_c": 16.9,
                "heatindex_f": 62.4,
                "dewpoint_c": 16.1,
                "dewpoint_f": 61,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 11.6,
                "gust_kph": 18.7,
                "uv": 4
            },
            {
                "time_epoch": 1694538000,
                "time": date + " 13:00",
                "temp_c": 16.9,
                "temp_f": 62.4,
                "is_day": 1,
                "condition": {
                    "text": "Mist",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/143.png",
                    "code": 1030
                },
                "wind_mph": 7.2,
                "wind_kph": 11.5,
                "wind_degree": 94,
                "wind_dir": "E",
                "pressure_mb": 1019,
                "pressure_in": 30.09,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 95,
                "cloud": 100,
                "feelslike_c": 16.9,
                "feelslike_f": 62.4,
                "windchill_c": 16.9,
                "windchill_f": 62.4,
                "heatindex_c": 16.9,
                "heatindex_f": 62.4,
                "dewpoint_c": 16.1,
                "dewpoint_f": 61,
                "will_it_rain": 1,
                "chance_of_rain": 71,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 9.8,
                "gust_kph": 15.8,
                "uv": 4
            },
            {
                "time_epoch": 1694541600,
                "time": date + " 14:00",
                "temp_c": 19.8,
                "temp_f": 67.6,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 7.4,
                "wind_kph": 11.9,
                "wind_degree": 90,
                "wind_dir": "E",
                "pressure_mb": 1015,
                "pressure_in": 29.98,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 92,
                "cloud": 100,
                "feelslike_c": 19.8,
                "feelslike_f": 67.6,
                "windchill_c": 19.8,
                "windchill_f": 67.6,
                "heatindex_c": 19.8,
                "heatindex_f": 67.6,
                "dewpoint_c": 18.4,
                "dewpoint_f": 65.1,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 10.1,
                "gust_kph": 16.2,
                "uv": 4
            },
            {
                "time_epoch": 1694545200,
                "time": date + " 15:00",
                "temp_c": 16.6,
                "temp_f": 61.9,
                "is_day": 1,
                "condition": {
                    "text": "Mist",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/143.png",
                    "code": 1030
                },
                "wind_mph": 7.4,
                "wind_kph": 11.9,
                "wind_degree": 91,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.06,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 96,
                "cloud": 100,
                "feelslike_c": 16.6,
                "feelslike_f": 61.9,
                "windchill_c": 16.6,
                "windchill_f": 61.9,
                "heatindex_c": 16.6,
                "heatindex_f": 61.9,
                "dewpoint_c": 15.9,
                "dewpoint_f": 60.6,
                "will_it_rain": 0,
                "chance_of_rain": 66,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 10.3,
                "gust_kph": 16.6,
                "uv": 4
            },
            {
                "time_epoch": 1694548800,
                "time": date + " 16:00",
                "temp_c": 16.5,
                "temp_f": 61.7,
                "is_day": 1,
                "condition": {
                    "text": "Mist",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/143.png",
                    "code": 1030
                },
                "wind_mph": 6.9,
                "wind_kph": 11.2,
                "wind_degree": 90,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.06,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 96,
                "cloud": 100,
                "feelslike_c": 16.5,
                "feelslike_f": 61.7,
                "windchill_c": 16.5,
                "windchill_f": 61.7,
                "heatindex_c": 16.5,
                "heatindex_f": 61.7,
                "dewpoint_c": 15.8,
                "dewpoint_f": 60.4,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 9.6,
                "gust_kph": 15.5,
                "uv": 4
            },
            {
                "time_epoch": 1694552400,
                "time": date + " 17:00",
                "temp_c": 19.5,
                "temp_f": 67.1,
                "is_day": 1,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
                    "code": 1009
                },
                "wind_mph": 6.5,
                "wind_kph": 10.4,
                "wind_degree": 85,
                "wind_dir": "E",
                "pressure_mb": 1015,
                "pressure_in": 29.98,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 91,
                "cloud": 100,
                "feelslike_c": 19.5,
                "feelslike_f": 67.1,
                "windchill_c": 19.5,
                "windchill_f": 67.1,
                "heatindex_c": 19.5,
                "heatindex_f": 67.1,
                "dewpoint_c": 18,
                "dewpoint_f": 64.4,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 2,
                "vis_miles": 1,
                "gust_mph": 9.2,
                "gust_kph": 14.8,
                "uv": 4
            },
            {
                "time_epoch": 1694556000,
                "time": date + " 18:00",
                "temp_c": 16.5,
                "temp_f": 61.7,
                "is_day": 1,
                "condition": {
                    "text": "Fog",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/248.png",
                    "code": 1135
                },
                "wind_mph": 6,
                "wind_kph": 9.7,
                "wind_degree": 81,
                "wind_dir": "E",
                "pressure_mb": 1018,
                "pressure_in": 30.05,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 97,
                "cloud": 100,
                "feelslike_c": 16.5,
                "feelslike_f": 61.7,
                "windchill_c": 16.5,
                "windchill_f": 61.7,
                "heatindex_c": 16.5,
                "heatindex_f": 61.7,
                "dewpoint_c": 16,
                "dewpoint_f": 60.8,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 0,
                "vis_miles": 0,
                "gust_mph": 8.7,
                "gust_kph": 14,
                "uv": 4
            },
            {
                "time_epoch": 1694559600,
                "time": date + " 19:00",
                "temp_c": 16.4,
                "temp_f": 61.5,
                "is_day": 0,
                "condition": {
                    "text": "Light rain shower",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/353.png",
                    "code": 1240
                },
                "wind_mph": 5.8,
                "wind_kph": 9.4,
                "wind_degree": 75,
                "wind_dir": "ENE",
                "pressure_mb": 1018,
                "pressure_in": 30.05,
                "precip_mm": 0.2,
                "precip_in": 0.01,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 16.4,
                "feelslike_f": 61.5,
                "windchill_c": 16.4,
                "windchill_f": 61.5,
                "heatindex_c": 16.4,
                "heatindex_f": 61.5,
                "dewpoint_c": 16,
                "dewpoint_f": 60.8,
                "will_it_rain": 0,
                "chance_of_rain": 64,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 8.7,
                "gust_kph": 14,
                "uv": 1
            },
            {
                "time_epoch": 1694563200,
                "time": date + " 20:00",
                "temp_c": 18,
                "temp_f": 64.4,
                "is_day": 0,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/122.png",
                    "code": 1009
                },
                "wind_mph": 5.4,
                "wind_kph": 8.6,
                "wind_degree": 66,
                "wind_dir": "ENE",
                "pressure_mb": 1016,
                "pressure_in": 30.01,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 93,
                "cloud": 100,
                "feelslike_c": 18,
                "feelslike_f": 64.4,
                "windchill_c": 18,
                "windchill_f": 64.4,
                "heatindex_c": 18,
                "heatindex_f": 64.4,
                "dewpoint_c": 16.9,
                "dewpoint_f": 62.4,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 8.1,
                "gust_kph": 13,
                "uv": 1
            },
            {
                "time_epoch": 1694566800,
                "time": date + " 21:00",
                "temp_c": 16.3,
                "temp_f": 61.3,
                "is_day": 0,
                "condition": {
                    "text": "Fog",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/248.png",
                    "code": 1135
                },
                "wind_mph": 5.1,
                "wind_kph": 8.3,
                "wind_degree": 63,
                "wind_dir": "ENE",
                "pressure_mb": 1018,
                "pressure_in": 30.05,
                "precip_mm": 0.1,
                "precip_in": 0,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 16.3,
                "feelslike_f": 61.3,
                "windchill_c": 16.3,
                "windchill_f": 61.3,
                "heatindex_c": 16.3,
                "heatindex_f": 61.3,
                "dewpoint_c": 16.1,
                "dewpoint_f": 61,
                "will_it_rain": 1,
                "chance_of_rain": 75,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 0,
                "vis_miles": 0,
                "gust_mph": 7.8,
                "gust_kph": 12.6,
                "uv": 1
            },
            {
                "time_epoch": 1694570400,
                "time": date + " 22:00",
                "temp_c": 16.3,
                "temp_f": 61.3,
                "is_day": 0,
                "condition": {
                    "text": "Light rain shower",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/353.png",
                    "code": 1240
                },
                "wind_mph": 4.5,
                "wind_kph": 7.2,
                "wind_degree": 62,
                "wind_dir": "ENE",
                "pressure_mb": 1018,
                "pressure_in": 30.05,
                "precip_mm": 0.2,
                "precip_in": 0.01,
                "humidity": 98,
                "cloud": 100,
                "feelslike_c": 16.3,
                "feelslike_f": 61.3,
                "windchill_c": 16.3,
                "windchill_f": 61.3,
                "heatindex_c": 16.3,
                "heatindex_f": 61.3,
                "dewpoint_c": 16.1,
                "dewpoint_f": 61,
                "will_it_rain": 1,
                "chance_of_rain": 78,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 6.9,
                "gust_kph": 11.2,
                "uv": 1
            },
            {
                "time_epoch": 1694574000,
                "time": date + " 23:00",
                "temp_c": 17.1,
                "temp_f": 62.8,
                "is_day": 0,
                "condition": {
                    "text": "Overcast",
                    "icon": "//cdn.weatherapi.com/weather/64x64/night/122.png",
                    "code": 1009
                },
                "wind_mph": 5.1,
                "wind_kph": 8.3,
                "wind_degree": 73,
                "wind_dir": "ENE",
                "pressure_mb": 1016,
                "pressure_in": 30.01,
                "precip_mm": 0,
                "precip_in": 0,
                "humidity": 94,
                "cloud": 100,
                "feelslike_c": 17.1,
                "feelslike_f": 62.8,
                "windchill_c": 17.1,
                "windchill_f": 62.8,
                "heatindex_c": 17.1,
                "heatindex_f": 62.8,
                "dewpoint_c": 16.2,
                "dewpoint_f": 61.2,
                "will_it_rain": 0,
                "chance_of_rain": 0,
                "will_it_snow": 0,
                "chance_of_snow": 0,
                "vis_km": 10,
                "vis_miles": 6,
                "gust_mph": 8.1,
                "gust_kph": 13,
                "uv": 1
            }
        ]
        }
    }
}