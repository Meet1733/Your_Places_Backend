require('dotenv').config();

const axios = require('axios');

const HttpError = require('../models/http-error');

const API_KEY = process.env.OLA_API_KEY;

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(
      address
    )}&language=English&api_key=${API_KEY}`
  );

  const data = response.data;

  if (!data || data.status === 'zero_results') {
    const error = new HttpError(
      'Could not find location for the specified address. Please enter a valid address.',
      422
    );
    throw error;
  }

  const coordinates = data.geocodingResults[0].geometry.location;
  return coordinates;
}

module.exports = getCoordsForAddress;
