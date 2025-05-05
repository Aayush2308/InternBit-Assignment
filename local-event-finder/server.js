const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Allow CORS for all origins (for development)
app.use(cors());

const API_TOKEN = 'IPJJIBBTJNCCOF2TJY'

app.get('/events', async (req, res) => {
  try {
    const { latitude, longitude, q, date } = req.query;
    const params = {
      'location.latitude': latitude,
      'location.longitude': longitude,
      expand: 'venue',
    };
    if (q) params.q = q;
    if (date) params['start_date.range_start'] = new Date(date).toISOString();

    const response = await axios.get(
      'https://www.eventbriteapi.com/v3/events/search/',
      {
        params,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`, // Use your private token here
        },
      }
    );
    console.log('Eventbrite API response:', response.data);
    res.json(response.data);
  } catch (err) {
    console.error('Eventbrite API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch events', details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});