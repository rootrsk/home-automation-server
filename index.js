require("dotenv").config()
require("./src/config/db")

const morgan = require('morgan')
const express = require('express')
const bodyParser = require('body-parser')
const useragent = require('express-useragent')
const cookieParser = require('cookie-parser')

const User = require('./src/models/user')
const cors = require("./src/config/cors")
const userRouter = require('./src/routes/user')
const adminRouter = require('./src/routes/admin')
const { addUser, removeUser, getAllUsers}  = require('./src/utils/userTracker')

const app = express()
const http = require('http').createServer(app)


const io = require('socket.io')(http,{
    path:'/socket.io/',
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    }
})

let liveSocket = null
const PORT = process.env.PORT || 3001
// const PORT = 808944

app.use(cors)
app.use(cookieParser())
app.use(express.json())
app.use(morgan('combined'))
app.use(useragent.express())
app.use(bodyParser.urlencoded({extended: true}))

app.use(adminRouter)
app.use(userRouter)

app.get('/status',(req,res)=>{
    res.send({
        status:200,
        connection:'Successful',
        device: req.useragent.source
    })
})
app.get('/api/voice',(req,res)=>{
    try {
        console.log(req.query)
        console.log(req.body)
        res.json({
            status:200
        })
    } catch (error) {
        res.json({
            status:404
        })
    }
})


http.listen(PORT,()=>{
    console.log(`Server started at port ${PORT}`)
})

const switchStatus = [false,false,false,false,false,false,false,false]
const arduinoStatus = {connected:false}


app.post('/voice', (req, res) => {
    console.log(req.body,req.query)
    let switch_no = null
    const status = req.body.action === 'off'? false : true
    const username = 'Google Assistant'
    const nightLight = ['nightlight', 'night light', 'the night light','strip light','the strip light']
    const tubeLight = ['tubelight', 'tube light', 'light', 'the light','the tube light']
    const cellingFan = ['cellingfan', 'celling fan', 'fan']
    const laptop = ['laptop', 'laptopcharger', 'laptop charger', 'charger']
    const desktop = ['desktop', 'pc', 'desktop charger', 'desktopcharger', 'monitor']
    console.log(req.query.cmd.toLowerCase())
    if (nightLight.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 1
    }
    if (tubeLight.includes(req.query.cmd.toLowerCase().trim())) {
        console.log('light command')
        switch_no = 7
    }
    if (cellingFan.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 8
    }
    if (laptop.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 5
    }
    if (desktop.includes(req.query.cmd.toLowerCase())) {
        switch_no = 6
    }
    if(!switch_no){
        return res.json({
            status: 'failed',
            error:'invalid command'
        })
    }
    try {
        if(process.env.VOICE_KEY!== req.body.key){
            return res.json({
                status:'failed',
                error:'invalid key'
            })
        }
        console.log(req.query)
        if (liveSocket) {
            console.log('liveSocket')
            switchStatus[switch_no-1] = status
            io.in('123').emit('switch-triggered', ({switch_no,status,username}))
        }
        res.json({
            status: 'success',
        })
    } catch (error) {
        console.log(error)
        res.json({
            status: 'failed',
            error: error.message
        })
    }
})

io.on('connection', async(socket) => {
    console.log(socket.handshake.headers['user-agent'])
    console.log("New Connection")
    socket.emit('message',{message:'Welcome'})
    socket.on('join',async({username,password,room}={})=>{
        try {
            if(!username || !password || !room){
                return socket.emit('login',{error:'Please provide all fields',user:null,status:400})
            }
            console.log('joining room called',room)

            const user = await User.findByCredentials({email:username,username,password})
            console.log({user})
            if(!user) throw new Error('User not found.')
            const {error} = addUser({username: user.username,room,id:socket.id})
            // if(error) throw new Error(error)

            socket.emit('login',{error:'',status: 200,user})
            socket.broadcast.to(room).emit('new_connection',{user,message:'new user has joined the room.'})
            
            socket.join(room)
            socket.emit('req-arduino-status','requested')
            console.log({username,u:user.username})
            if(user.username.includes('arduino')){
                console.log('arduino connected')
                arduinoStatus.connected = true
                console.log(getAllUsers())
            }
            
            syncDebounce(room)
            liveSocket = socket

        } catch (error) {
            console.log(error)
            return socket.emit('login',{error:error.message,status:400})
        }
    })
    socket.on('switch-trigger',({switch_no,status,username})=>{
        console.log('switch-trigger')
        console.log({switch_no,status,username})
        switchStatus[switch_no-1] = status
        io.to('123').emit('switch-triggered', ({switch_no,status,username}))
    })
    socket.on('arduino-status',(status)=>{
        Object.entries(status).forEach(([key, value], index) => switchStatus[index] = Boolean(parseInt(value)));
        socket.broadcast.to('123').emit('arduino-data', switchStatus)
    })
    socket.on('sensor-send',({temp,humidity,co,ch,time})=>{
        if(!time) time= new Date();
        console.log("sensor-data",{temp,humidity,co,ch,time})
        socket.broadcast.to('123').emit('sensor-sent', ({temp,humidity,co,ch,time}))
    })
    socket.on('disconnecting', async(reason) => {
        console.log("A user is disconnecting.")
        const user = await removeUser({id:socket.id})
        console.log(user)
        if(user){
            if (user.username.includes('arduino')) {
                // socket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.connected  = false
                syncDebounce('123')
            }
        }
    })
    socket.on('disconnect', async(reason) => {
        console.log("A user is disconnected.")
        const user = await removeUser({id:socket.id})
        console.log({user})
        if(user){
            if (user.username.includes('arduino')) {
              console.log("user removed")
                // socket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.connected  = false
                syncDebounce('123')
            }
        }
    })
    socket.on('sync-with-arduino',(data)=>{
        console.log('arduino-sync-data',data)
    })
    socket.on('sensor-send',(data)=>{
        console.log(data)
        
    })

    function debounce(func, timeout = 1000){
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }
    function syncHandler(room){
        io.in(room).emit('sync', {switchStatus,arduinoStatus})
    }

    const syncDebounce = debounce((room) => syncHandler(room));
});


module.exports = app;