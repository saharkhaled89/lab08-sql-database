// 'use strict';
// require('dotenv').config();
// const express = require('express');
// const pg = require('pg');
// const PORT = process.env.PORT || 4000;
// const app = express();
// // make a connection to the psql using the provided link
// const client = new pg.Client(process.env.DATABASE_URL);

// client.on('error', (err) => {
//   throw new Error(err);
// });
// // get data from the query and Insert it to the DB
// app.get('/add', (req, res) => {
//   let name = req.query.name;
//   let role = req.query.role;
//   const SQL = 'INSERT INTO people(name,role) VALUES ($1,$2) RETURNING *';
//   const safeValues = [req.query.name, req.query.role];
//   client
//     .query(SQL, safeValues)
//     .then((results) => {
//       res.status(200).json(results.rows);
//     })
//     .catch((err) => {
//       res.status(500).send(err);
//     });
// });
// app.get('/people', (req, res) => {
//   const SQL = 'SELECT * FROM people;';
//   client
//     .query(SQL)
//     .then((results) => {
//       res.status(200).json(results.rows);
//     })
//     .catch((err) => {
//       res.status(500).send(err);
//     });
// });
// client
//   .connect()
//   .then(() => {
//     app.listen(PORT, () =>
//       console.log(`my server is up and running on port ${PORT}`)
//     );
//   })
//   .catch((err) => {
//     throw new Error(`startup error ${err}`);
//   });




'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();
const pg = require('pg');
// Application Dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
// Application Setup
const PORT = process.env.PORT;
const app = express();
app.use(cors());

app.get('/', (request, response) => {
  response.send('Home Page!');
});

//Creating a new client using the PG constructor function from the pg library
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => {
    throw new Error(err);
});

// Route Definitions
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailsHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);

// Route Handlers


// Route Handlers

function locationHandler(request, response) {
  // try {
  //   const geoData = require('./data/geo.json');
  //   const city = request.query.city;
  //   const locationData = new Location(city, geoData);
  //   console.log(locationData);
  //   response.status(200).send(locationData);
  // } catch (error) {
  //   errorHandler(
  //     'an error happened while fetching your data!\n' + error,
  //     request,
  //     response
  //   );
  // }
  const city = request.query.city;
  console.log(city);
  const dataBaseCityQuery = 'SELECT search_query, formatted_query, latitude, longitude FROM thelocations WHERE search_query LIKE $1'
  client.query(dataBaseCityQuery, [city]).then((result) => {
    if (result.rows.length !== 0) {
        
          response.status(200).json(result.rows[0]);
      }
  else {
    superagent(
      `https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
    )
      .then((res) => {
        const geoData = res.body;
        const locationData = new Location(city, geoData);
        const SQL = 'INSERT INTO thelocations(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
        const safeValues = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];
        client.query(SQL, safeValues).then(result => {
            response.status(200).json(locationData);
  
          })
          .catch(err => {
              response.status(500).send(err);
          })
  })
  .catch((err) => {
      errorHandler(err, request, response);
  });
  }
});}



function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}

function weatherHandler(request, response) {
  // try {
  //   const weatherRes = require('./data/darksky.json');
  //   const weatherSummaries = weatherRes.data.map((day) => {
  //     return new Weather(day);
  //   });
  //   response.status(200).json(weatherSummaries);
  // } catch (error) {
  //   errorHandler(
  //     'So sorry, something went wrong with weather.',
  //     request,
  //     response
  //   );
  // }
  superagent(
    `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
  )
    .then((weatherRes) => {
      console.log(weatherRes);
      const weatherSummaries = weatherRes.body.data.map((day) => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch((err) => errorHandler(err, request, response));
}

function Weather(day) {
  this.forecast = day.weather.description;
  this.time = new Date(day.valid_date).toString().slice(0, 15);
}






function trailsHandler(request, response) {
  const latitude = request.query.latitude;
  const longitude = request.query.longitude;
  // console.log(latitude, longitude)
  superagent(
    `https://www.hikingproject.com/data/get-trails?lat=${latitude}&lon=${longitude}&maxDistance=400&key=${process.env.TRAILS_API_TOKEN}`
  )
    .then((trailRes) => {
      // console.log(trailRes.body.trails);     
      // let trailsDataArray = [];
      const trailInfo = trailRes.body.trails.map(trailData => {
        return new Trailslocations(trailData);
       
      });
      // console.log(trailsDataArray[0])
      response.status(200).json(trailInfo);
    })
    .catch((err) => {
      errorHandler(err, request, response);
    });
}


function Trailslocations(trailData) {
  this.name = trailData.name;
  this.location = trailData.location;
  this.length = trailData.length;
  this.stars = trailData.stars;
  this.star_votes = trailData.star_votes;
  this.summary = trailData.summary;
  this.trail_url = trailData.trail_url;
  this.conditions = trailData.conditions;
  this.condition_date = trailData.condition_date;
  this.condition_time = trailData.condition_time;
  // console.log(this)
}




function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}

// Make sure the server is listening for requests
// app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
//To get the sever listening to a certain port and go live

client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`my server is up and running on port ${PORT}`)
    );
  })
  .catch((err) => {
    throw new Error(`startup error ${err}`);
  });
