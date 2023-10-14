To Run Simple Weather App: 
- Open 'WeatherApp.html' in a chrome, firefox, or edge (other browsers have not been tested)

Instructions:
- Upon opening the page it will load the weather for your area based on your ip address

Search for the weather at a location:
- Use the input in the top of the page to enter the name of a city (city, state, country) or zip to
search for the right location from the weather database
- Any cities with the associated names will be displayed in a listbox that pops up. Either click on one of the cities
or navigate to them with the up/down arrow keys. Upon highlighting the correct location, hit enter and it will
send a query to the database for the weather at that location
- Once you have loaded the data for the desired location, if you ever want to update the data with the latest in
the database, click on the refresh button directly above the current weather card

Change units of measurement displayed:
- You can toggle between imperial and metric measurements by clicking on the degrees button at the very top-right
of the page


DEVELOPERS:
To test the app with dummy data instead of querying the api:
- modify the const "testing" in NathanBlack_WeatherApp.html to true instead of false.
- update the const "forecastCount" to number of desired forecast days.