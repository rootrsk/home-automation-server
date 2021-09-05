

const users = []

module.exports =  function findUser({username,id,room}) {
    
}

function removeUser({id}) {
    const index  = users.findIndex((user)=>user.id===id)
    console.log(users)
    if(index !== -1){
        return users.splice(index,1)[0]
    }
    console.log(users)
    return null
}

function addUser({username,room,id}) {
    
    const index = users.findIndex((user)=>user.username === username)
    console.log(index)
    if(index !== -1){
        return {error:'user is already loggedin'}
    }
    users.push({username,id,room})
    return {user:{username,id,room}}
}
function getAllUsers() {
    return users
}
module.exports = {
    addUser,
    removeUser,
    getAllUsers
}