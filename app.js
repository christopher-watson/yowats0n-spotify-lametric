const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const request = require('request');
const querystring = require('querystring');
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(__dirname + '/public'))
   .use(cookieParser())
   .use(cors());
// app.options('*', cors())
// app.use((req, res, next) => {
//    res.header('Access-Control-Allow-Origin', '*');
//    res.header('Access-Control-Allow-Headers', '*');
//    if (req.method === 'OPTIONS') {
//       res.headers('Access Control-Allow-Methods', 'POST, GET');
//       return res.status(200).json({});
//    }
//    next();
// });

const client_id = process.env.SPOTIFY_CLIENT_ID; // Your client id
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
const redirect_uri_client = `${process.env.SERVER}/callback-client`; // Your redirect uri
const redirect_uri_server = `${process.env.SERVER}/callback-server`; // Your redirect uri

console.log(process.env.SERVER);

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
   let text = '';
   const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

   for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return text;
};

var stateKey = 'spotify_auth_state';

app.get('/nowPlayingClient', function (req, res) {
   console.log(redirect_uri_client);
   var state = generateRandomString(16);
   res.cookie(stateKey, state);

   // your application requests authorization
   var scope = 'user-read-playback-state user-read-currently-playing';
   res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
         response_type: 'code',
         client_id: client_id,
         scope: scope,
         redirect_uri: redirect_uri_client,
         state: state
      }));
});

app.get('/nowPlayingServer', function (req, res) {
   console.log(redirect_uri_server);
   var state = generateRandomString(16);
   res.cookie(stateKey, state);

   // your application requests authorization
   var scope = 'user-read-playback-state user-read-currently-playing';
   res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
         response_type: 'code',
         client_id: client_id,
         scope: scope,
         redirect_uri: redirect_uri_server,
         state: state
      }));
});

app.get('/callback-server', function (req, res) {
   // your application requests refresh and access tokens
   // after checking the state parameter
   var code = req.query.code || null;
   var state = req.query.state || null;
   var storedState = req.cookies ? req.cookies[stateKey] : null;

   if (state === null || state !== storedState) {
      res.redirect('/#' +
         querystring.stringify({
            error: 'state_mismatch'
         }));
   } else {
      res.clearCookie(stateKey);
      var authOptions = {
         url: 'https://accounts.spotify.com/api/token',
         form: {
            code: code,
            redirect_uri: redirect_uri_server,
            grant_type: 'authorization_code'
         },
         headers: {
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
         },
         json: true
      };

      request.post(authOptions, async (error, response, body) => {
         if (!error && response.statusCode === 200) {

            const access_token = body.access_token
            const refresh_token = body.refresh_token;

            var options = {
               url: 'https://api.spotify.com/v1/me',
               headers: { 'Authorization': 'Bearer ' + access_token },
               json: true
            };

            const spotifyApi = new SpotifyWebApi();
            spotifyApi.setAccessToken(access_token);

            try {
               const { body: nowPlaying } = await spotifyApi.getMyCurrentPlaybackState();
               let responseText = '';
               if (nowPlaying['is_playing'] && nowPlaying.item && nowPlaying.item.name && nowPlaying.item.artists) {
                  const track = nowPlaying.item.name;
                  const artists = nowPlaying.item.artists.map(artist => artist.name).join(', ');
                  responseText = `${track} - ${artists}`;
               }
               console.log(responseText);
               res.status(200).send({
                  "frames": [
                     {
                        "text": responseText,
                        "icon": "i647" // Spotify logo.
                     }
                  ]
               });
            } catch (err) {
               console.error(err);
               res.status(err.statusCode).send(err.message);
            }
         } else {
            res.redirect('/#' +
               querystring.stringify({
                  error: 'invalid_token'
               }));
         }
      });
   }
});

app.get('/callback-client', function (req, res) {
   // your application requests refresh and access tokens
   // after checking the state parameter
   var code = req.query.code || null;
   var state = req.query.state || null;
   var storedState = req.cookies ? req.cookies[stateKey] : null;

   if (state === null || state !== storedState) {
      res.redirect('/#' +
         querystring.stringify({
            error: 'state_mismatch'
         }));
   } else {
      res.clearCookie(stateKey);
      var authOptions = {
         url: 'https://accounts.spotify.com/api/token',
         form: {
            code: code,
            redirect_uri: redirect_uri_client,
            grant_type: 'authorization_code'
         },
         headers: {
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
         },
         json: true
      };

      request.post(authOptions, function (error, response, body) {
         if (!error && response.statusCode === 200) {

            const access_token = body.access_token
            const refresh_token = body.refresh_token;

            var options = {
               url: 'https://api.spotify.com/v1/me',
               headers: { 'Authorization': 'Bearer ' + access_token },
               json: true
            };

            const spotifyApi = new SpotifyWebApi();
            spotifyApi.setAccessToken(access_token);

            // use the access token to access the Spotify Web API
            request.get(options, async (error, response, body) => {
               console.log('Spotify Body', body);
               try {
                  const { body: nowPlaying } = await spotifyApi.getMyCurrentPlaybackState();
                  // let responseText = '';
                  // if (nowPlaying['is_playing'] && nowPlaying.item && nowPlaying.item.name && nowPlaying.item.artists) {
                  //    const track = nowPlaying.item.name;
                  //    const artists = nowPlaying.item.artists.map(artist => artist.name).join(', ');
                  //    responseText = `${track} - ${artists}`;
                  // }
                  console.log(nowPlaying);
                  res.status(200).send({
                     nowPlaying
                  });
               } catch (err) {
                  console.error(err);
                  res.status(err.statusCode).send(err.message);
               }
            });

            // // we can also pass the token to the browser to make requests from there
            // res.redirect('/#' +
            //    querystring.stringify({
            //       access_token: access_token,
            //       refresh_token: refresh_token
            //    }));

         } else {
            res.redirect('/#' +
               querystring.stringify({
                  error: 'invalid_token'
               }));
         }
      });
   }
});

app.get('/refresh_token', function (req, res) {
   // requesting access token from refresh token
   var refresh_token = req.query.refresh_token;
   var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) },
      form: {
         grant_type: 'refresh_token',
         refresh_token: refresh_token
      },
      json: true
   };

   request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
         var access_token = body.access_token;
         global_access_token = body.access_token;
         res.send({
            'access_token': access_token
         });
      }
   });
});

module.exports = app;
