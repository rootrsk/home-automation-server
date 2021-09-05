const userErrorHandler = (error) =>{
    console.log(error)
    if (error.includes('username: Path `username` is required')){
        return 'Username is requred'
    }
    if (error.includes('email: Path `email` is required')) {
        return 'Email is required'
    }
    if (error.includes('password: Path `password` is required.')){
        return 'Password is required'
    }
    if (error.includes('E11000 duplicate key error collection: home-automation.users index: email_1 dup key')) {
        return 'Email is already registered'
    }
    if (error.includes('home-automation.users index: username_1')){
        return 'Username is already taken, try another.'
    }

    return 'Something went wrong'
}

const testErrorHandler = (error) =>{
    console.log(error)
    return 'Something went Wrong'
}

module.exports = {
    userErrorHandler,
    testErrorHandler
}