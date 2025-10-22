#!/usr/bin/env node
import axios from 'axios'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

async function main() {
  const rl = readline.createInterface({ input, output })

  const email = (await rl.question('MIT email (e.g. test@mit.edu): ')).trim()
  const password = (await rl.question('Password: ')).trim()
  const firstName = (await rl.question('First name: ')).trim()
  const lastName = (await rl.question('Last name: ')).trim()

  try {
    // 1) registerUser
    const r1 = await api.post('/UserAuthentication/registerUser', { email, password })
    const user = r1.data.user
    console.log('Registered user =', user)

    // 2) createProfile
    await api.post('/UserProfile/createProfile', {
      user,
      firstName,
      lastName,
      bio: null,
      thumbnail: null,
    })
    console.log('Profile created')

    // 3) sendVerificationCode
    await api.post('/UserAuthentication/sendVerificationCode', { user, email })
    console.log('Verification code sent. Check backend logs or email service output.')

    const code = (await rl.question('Enter the verification code: ')).trim()

    // 4) verifyCode
    const r2 = await api.post('/UserAuthentication/verifyCode', { user, code })
    console.log('Verified =', r2.data.verified)

    // 5) login
    const r3 = await api.post('/UserAuthentication/login', { email, password })
    console.log('Login user id =', r3.data.user)

    console.log('\nDone. You can now login in the UI with:', email)
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error('API error:', e.response?.data || e.message)
    } else {
      console.error('Unexpected error:', e)
    }
  }

  process.exit(0)
}

main()
