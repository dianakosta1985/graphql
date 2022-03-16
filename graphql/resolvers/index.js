const Event = require('../../models/event');
const User = require('../../models/user');
const Booking = require('../../models/booking');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const eventsFunc = eventids => {
    return Event.find({_id: {$in: eventids}})
    .then(events => {
        return events.map(event=>{
            return {
                ...event._doc,
                _id: event.id,
                creator: user.bind(this, event.creator)
            }
        })
    })
    .catch(err=> {throw err}); 
}

const user = userId => {
    return User.findById(userId)
    .then(user=>{
        return {...user._doc,
             _id: user.id,
            createdEvents: eventsFunc.bind(this, user._doc.createdEvents)}
    })
    .catch(err=> {
        throw err
    });
}

module.exports = {
    events: () => {
        return Event.find()
        .then(events => {
            return events.map(event=>{
                return {
                    ...event._doc, 
                    _id: event.id,
                    creator: user.bind(this, event._doc.creator)
                };
            })
        })
        .catch(err => {
            throw err;
        });
    },
    booking: async ()=>{
        try{
            const bookings =  await Booking.find();
            return bookings.map(booking => {
                return {
                    ...booking._doc, 
                    _id: booking.id, 
                    createdAt:  new Date(booking._doc.createdAt).toISOString(),
                    updatedAt:  new Date(booking._doc.updatedAt).toISOString(),

                }
            })
        }catch(err){
            throw err;
        }
    },
    bookEvent: async (args, req) => {
        if(!req.isAuth){
            throw new Error('Unauthenticated!');
        }
        const fetchedEvent = await Event.findOne({_id: args.eventId})
        const booking = new Booking({
            user: req.userId,
            event: fetchedEvent
        });
        const result = await booking.save();
        return {
            ...result._doc,
            _id: result.id,
            user: user.bind(this, booking._doc.user),
            createdAt:  new Date(booking._doc.createdAt).toISOString(),
            updatedAt:  new Date(booking._doc.updatedAt).toISOString()
        }
    },

    cancelBooking: async (args, req) => {
        try{
            if(!req.isAuth){
                throw new Error('Unauthenticated!');
            }
            const booking = await Booking.findById(args.bookingId).populate('event');
            const event = {
                ...booking.event._doc,
                _id: booking.eventId,
                creator: user.bind(this, booking.event._doc.creator)
            };
            await Booking.deleteOne({_id: args.bookingId});
            return event;

        }catch(err){
            throw err;
        }
    },


    createEvent: (args, req) => {
        if(!req.isAuth){
            throw new Error('Unauthenticated!');
        }
        const event = new Event({
            title: args.eventInput.title,
            description: args.eventInput.description,
            price: +args.eventInput.price,
            date: new Date(args.eventInput.date),
            creator: req.userId
        });
        let createdEvent;
        return event
            .save()
            .then(result => {
                createdEvent = {...result._doc, _id: result._doc._id.toString()};
                return User.findById(req.userId);
            })
            .then(user=>{
                if(!user){
                    throw new Error ('User not found')
                }
                user.createdEvents.push(event);
                return user.save();
            })
            .then(result=>{
                return createdEvent;
            })
            .catch(err =>{
                console.log(err);
                throw err;
            });
    },
    createUser: async (args, req) => {
        try{
            if(!req.isAuth){
                throw new Error('Unauthenticated!');
            }
            const existingUser =  await User.findOne({email: args.userInput.email})
            if(existingUser){
                throw new Error ('User is exist already');
            }
            const hashedPassword = await bcrypt.hash(args.userInput.password, 1);
            const user = new User({
                email: args.userInput.email,
                password: hashedPassword
            });
            const result = await user.save();
            return {...result._doc , _id: user.id, password: null}

        }catch(err){
            console.log(err);
            throw err;
        };
            
             
    },
    login: async({email, password}) => {
        const user = await User.findOne({email: email});
        if(!user){
           throw new Error ('User not exist') 
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if(!isEqual){
            throw new Error ('Password is incorrect!');
        }
        // create token
        const token = jwt.sign({userId: user.id, email: user.email}, 'somesupersecretkey', {expiresIn: '1h'});
        return { 
            userId: user.id ,
            token: token, 
            tokenExpiration: 1 }
    }
};