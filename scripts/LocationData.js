/**
 * class that holds data for a specific location. uses a name, region, and country
 */
class LocationData {
    constructor(name = "", region = "", country = ""){
        this.name = name;
        this.region = region;
        this.country = country;
    }

    /**
     * return whether there is a name in memory for this location or not
     * @returns {boolean} true: name is in memory, false: memory has an empty string or is null
     */
    isEmpty(){
        return this.name === "";
    }

    /**
     * return a readable string to the user based on data in memory
     * @returns {string} display string to display location to the user
     */
    getDisplayString(){
        let retVal = this.name;
        if (this.region !== "") {
            retVal = retVal + ", " + this.region;
        }
        if (this.country !== "United States of America") {
            retVal = retVal + ", " + this.country;
        }
        return retVal
    }

    /**
     * if no name is in memory, return an automatic search based on ip
     * @returns {string} search string used in search query to weatherAPI
     */
    getSearchString(){
        let retVal = "auto:ip";
        if (this.name !== "") {
            retVal = this.name;
            if (this.region !== ""){
                retVal = retVal + ", " + this.region;
            }
            if (this.country !== "") {
                retVal = retVal + ", " + this.country;
            }
        }
        return retVal;
    }

    /**
     * update the data in properties with the data in JSON object from weatherAPI
     * @param locationJSON {object} JSON object from weatherAPI location search
     * @returns {boolean} true: error was found when processing json object, false: no error in processing
     */
    updateFromJSON(locationJSON){
        let errorFound = false;
        if ("name" in locationJSON) this.name = locationJSON.name;
        else errorFound = true;

        this.region = locationJSON.region;
        this.country = locationJSON.country;

        return errorFound
    }
}