const axios = require('axios')

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

;(async function () {
  try {
    const res = await api.post('/UserAuthentication/cleanExpiredCodes', {})
    console.log('status:', res.status)
    console.log('data:', res.data)
  } catch (err) {
    if (err.response) {
      console.error('response status:', err.response.status)
      console.error('response data:', err.response.data)
    } else {
      console.error('error:', err.message || err)
    }
    process.exitCode = 1
  }
})()
