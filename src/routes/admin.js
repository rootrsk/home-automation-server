const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const {} = require('../middleware/error')
// const Test = require('../models/test')

// Get All user  ✓
router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find({})
        res.json({
            message: 'success',
            data: users
        })
    } catch (e) {
        res.json({
            message: 'error',
            error: 'Something went wrong.'
        })
    }
})




module.exports = router