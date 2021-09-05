const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const userAuth = require('../middleware/userAuth')
const {userErrorHandler} = require('../middleware/error')
// const Test = require('../models/test')
// const Answer = require('../models/answer')
// const Chart = require('../models/chart')
// const Notification = require('../models/notifications')

router.get('/notifications',async(req,res)=>{
    try {
        const notifications = await Notification.find({})
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            notifications
        })
    } catch (e) {
        res.json({
            status: 'failed',
            error: e.message,
            message: 'Something went Wrong.'
        })
    }
})

router.post('/notifications', async (req, res) => {
    try {
        const notification = new Notification(req.body)
        await notification.save()
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            notification
        })
    } catch (e) {
        res.json({
            status: 'failed',
            error: e.message,
            message: 'Something went Wrong.'
        })
    }
})
router.patch('/notifications', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.body._id,req.body)
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            notification
        })
        
    } catch (e) {
        res.json({
            status: 'failed',
            error: e.message,
            message: 'Something went Wrong.'
        })
    }
})
router.delete('/notifications/:_id', async (req, res) => {
    try {
        console.log(req.body)
        const notification = await Notification.findByIdAndRemove(req.body._id || req.params._id)
        if(!notification){

        }
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            notification
        })
    } catch (e) {
        res.json({
            status: 'failed',
            error: e.message,
            message: 'Something went Wrong.'
        })
    }
})

module.exports = router