/**
 *
 */
class LocationSearchBox {
    constructor(inputNode, listboxNode, searchFunction, queryFunction){
        // html components for combobox search
        this.inputNode = inputNode;
        this.listboxNode = listboxNode;
        // functions to handle searching for listbox children
        this.searchFunction = searchFunction;
        this.queryFunction = queryFunction;
        // initialize properties that hold data for locations available from search
        this.options = [];
        this.optionIndex = null;
        // timeout for typing to give the user time to finish typing
        this.timeoutTyping = null;
        // search timestamp of latest search so old searches do not overwrite latest
        this.latestSearchTimestamp = Date.now();

        // add event listeners to the inputNode
        this.inputNode.addEventListener('input', this.onInputNodeValueChange.bind(this));
        this.inputNode.addEventListener('propertychange', this.onInputNodeValueChange.bind(this));
        this.inputNode.addEventListener('keyup', this.onInputNodeKeyUp.bind(this));
        this.inputNode.addEventListener('focusin', this.onInputNodeFocus.bind(this));
        this.inputNode.addEventListener('focusout', this.onInputNodeFocus.bind(this, false));

        // initialize the listbox
        this.displayListbox(false);
        this.clearListbox("Type in more than 3 characters.");
    }

    /**
     * handle key events that would normally be associated with maneuvering the listbox in a combobox
     * @param event event from the event listener
     */
    onInputNodeKeyUp(event){
        switch (event.key){
            // initiate search query if a valid location is in memory
            case 'Enter':
                if (this.options.length > 0){
                    if (this.optionIndex === null) this.optionIndex = 0;
                    this.sendQuery(this.options[this.optionIndex]);
                    document.activeElement.blur();
                }
                break;
            // autofill the inputNode with location selected (first if none selected) if a valid location is in memory
            case 'Tab':
                if (this.options.length > 0){
                    if (this.optionIndex === null) this.optionIndex = 0;
                    this.updateValue(this.options[this.optionIndex]);
                    this.updateIndex(null);
                }
                break;
            // move up the array of valid options in memory
            case 'Up':
            case 'ArrowUp':
                if (this.options.length > 0){
                    if (this.optionIndex === null) this.updateIndex(this.options.length - 1);
                    else this.updateIndex(this.optionIndex - 1);
                }
                break;
            // move down the array of valid options in memory
            case 'Down':
            case 'ArrowDown':
                if (this.options.length > 0){
                    if (this.optionIndex === null) this.updateIndex(0);
                    else this.updateIndex(this.optionIndex + 1);
                }
                break;
            // deselect all options in memory on any other key input
            default:
                this.updateIndex(null);
        }
    }

    /**
     * process the new option index and update the associated children in the listbox to display which child
     * is highlighted. invalid indices and null indices are properly handled
     * @param newIndex {number, null}
     */
    updateIndex(newIndex = null){
        if (this.optionIndex !== null)
            this.listboxNode.children[this.optionIndex].className = "search-listbox-button";

        this.optionIndex = newIndex;
        if (newIndex !== null) {
            if (this.optionIndex < 0) this.optionIndex = this.options.length - 1;
            else if (this.optionIndex >= this.options.length) this.optionIndex = 0;

            this.listboxNode.children[newIndex].className = "search-listbox-button selected";
        }
    }

    /**
     * update the value stored and the text inside the inputNode
     * @param newLocation {LocationData, null}
     */
    updateValue(newLocation = null){
        if (newLocation === null)
            this.inputNode.value = "";
        else
            this.inputNode.value = newLocation.getDisplayString();
    }

    /**
     * set a timeout to properly display or hide the listbox depending on if input node gained or lost focus
     * this is important to not hide the listbox before a click has gone through on a button
     * @param focusGained {boolean} default: true; true: focus gained on input node, false: focus lost on input node
     */
    onInputNodeFocus(focusGained = true){
        if (focusGained) this.displayListbox();
        else {
            setTimeout(this.displayListbox.bind(this, false), 300);
        }
    }

    /**
     * handles changes to the inputNode string value. Queries for matching locations will be sent out automatically
     * when changes are made to the inputNode's value.
     */
    onInputNodeValueChange(){
        if (this.timeoutTyping != null){
            this.clearTypeTimeOutCall();
        }
        this.timeoutTyping = setTimeout(this.typeTimeoutCall.bind(this), 500);
    }

    /**
     * send a search query with the provided string
     * @param searchString {string} string to look for locations for
     */
    searchString(searchString){
        this.clearListbox();
        this.latestSearchTimestamp = Date.now();
        this.searchFunction(searchString, this.updateListbox.bind(this, Date.now()), this.searchFail.bind(this))
    }

    /**
     * inform the user that communication with the weatherAPI failed
     */
    searchFail(){
        this.clearListbox("Cannot Contact Server.");
    }

    /**
     * clear out the listbox and display a single non-interacting element simply to inform the user of something
     * @param emptyText {String} defaults: ...Searching for cities.; text to be displayed to user as first element
     */
    clearListbox(emptyText = "...Searching for cities."){
        this.listboxNode.innerHTML = "";
        this.options = [];
        this.optionIndex = null;
        let innerText =
            this.createListBoxDisplayText(emptyText);
        innerText.disabled = true;
        this.listboxNode.appendChild(innerText);
        this.listboxNode.children[0].style.borderTopRightRadius = "6px";
        this.listboxNode.children[0].style.borderTopLeftRadius = "6px";
    }

    // TODO - implement error reporting for successful search
    /**
     * update this search listbox if the timestamp is later than latest timestamp in memory with the data provided
     * in searchResponse array
     * @param timestamp {number} timestamp, in ms, for when search was first initiated
     * @param searchResponse {LocationData[]} array of processed objects of response from weatherAPI
     * @param errors {array} array of strings indicating information missing from response
     */
    updateListbox(timestamp, searchResponse = [], errors = []){
        if (timestamp >= this.latestSearchTimestamp) {
            // clear out everything stored
            this.listboxNode.innerHTML = "";
            this.options = [];
            this.optionIndex = null;
            // if search was unsuccessful, display to the user
            if (searchResponse.length <= 0) {
                this.clearListbox("No cities found with that name.");
            }
            // if search was successful, create the buttons and fill in data
            else {
                for (let location of searchResponse) {
                    this.options.push(location);
                    this.listboxNode.appendChild(this.createListBoxButton(location));
                }
                if (this.listboxNode.childElementCount > 0) {
                    this.listboxNode.children[0].style.borderTopRightRadius = "6px";
                    this.listboxNode.children[0].style.borderTopLeftRadius = "6px";
                }
            }
        }
    }

    /**
     * call function for the type timeout. this will update the listbox and send a search query as needed
     */
    typeTimeoutCall(){
        if (this.inputNode === document.activeElement) {
            let inputString = this.inputNode.value;
            // only send a search if search string is long enough
            if (inputString.length >= 3) {
                this.searchString(inputString);
            }
            else {
                this.clearListbox("Type in more than 3 characters.");
            }
        }
        this.timeoutTyping = null;
    }

    /**
     * clear out the type timeout stored in properties, if one exists
     */
    clearTypeTimeOutCall(){
        if (this.timeoutTyping != null){
            clearTimeout(this.timeoutTyping);
            this.timeoutTyping = null;
        }
    }

    /**
     * take location data and create a button to populate the listbox with
     * @param location {LocationData} location data to be used to populate the button
     * @returns {HTMLButtonElement} button to populate the listbox with
     */
    createListBoxButton(location){
        let newButton = document.createElement("button");
        newButton.className = 'search-listbox-button';
        newButton.type = 'button';
        newButton.innerHTML = location.getDisplayString();
        newButton.addEventListener("click", this.sendQuery.bind(this, location));
        return newButton;
    }

    /**
     * take a string to display the user and create a dummy button to populate the listbox with
     * @param displayString {String} string to be displayed to the user as information
     * @returns {HTMLButtonElement} uses a button to display information with no onclick function attached
     */
    createListBoxDisplayText(displayString){
        let newDisplayText = document.createElement("button");
        newDisplayText.className = 'search-listbox-display-text';
        newDisplayText.innerHTML = displayString;
        newDisplayText.disabled = true;
        return newDisplayText;
    }

    /**
     * either display or hide the listbox depending on the provided parameter
     * @param display {boolean} true: display listbox, false: hide listbox
     */
    displayListbox(display = true){
        this.updateIndex(null);
        if (display){
            this.listboxNode.style.display = "block";
        }
        else {
            this.listboxNode.style.display = "none";
        }
    }

    /**
     * send the stored query function for weather data with the provided location data
     * @param location {LocationData} location data to gather data for
     */
    sendQuery(location){
        this.updateValue(location);
        this.queryFunction(location);
    }
}
