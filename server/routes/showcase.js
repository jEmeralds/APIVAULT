// server/routes/showcase.js
// Returns showcase APIs with live data for the landing page ticker
// No auth required — public endpoint

import express from 'express'
import { db }  from '../db.js'

export const showcaseRoute = express.Router()

// GET /showcase — returns all APIs marked as showcase
showcaseRoute.get('/', async (req, res) => {
  try {
    const { data, error } = await db
      .from('api_registry')
      .select('slug, name, category, upstream_url, try_path')
      .eq('showcase', true)
      .eq('status', 'live')
      .limit(6)

    if (error) throw error
    res.json({ apis: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})