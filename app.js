const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");

app.set("view engine","ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
   .then(()=>{
       console.log("connected to db");
   })
   .catch((err)=>{
       console.log(err);
   });


async function main() {
    await mongoose.connect(MONGO_URL);
}

app.get("/", (req, res)=>{
    res.send("Hi, I am root");
});

// app.get("/testListing",async(req, res)=>{
//     let sampleListing = new Listing({
//         title: "My New Villa",
//         description:" By the beach",
//         price:1200,
//         location: "Calangute, Goa",
//         country: "India",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing ");
// });

const validateListing = (req, res, next)=>{
    let {error} = listingSchema.validate(req.body);
    
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400, errMsg);
    }   
    else{
        next();
    } 
}
const validateReview = (req, res, next)=>{
    let {error} = reviewSchema.validate(req.body);
   
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400, errMsg);
    }   
    else{
        next();
    } 
}

// Index Route
app.get("/listings", wrapAsync(async(req, res)=>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs",{allListings});
}));

// ("/listings/new")route ko upar rakhe nhi to new ko :id samajhkar error aayega
app.get("/listings/new",wrapAsync(async(req, res)=>{
    res.render("listings/new.ejs");
}));

//show Route
app.get("/listings/:id",wrapAsync(async(req, res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", {listing});
}));

// // create route
// app.post("/listings", async(req, res, next)=>{
//     try{
//        let newListing = new Listing(req.body.listing);
//        await newListing.save();
//        res.redirect("/listings");
//     }
//     catch(err){
//         next(err);
//     }
// });  

// create route -- wrapAsync wala
app.post("/listings",validateListing, wrapAsync(async(req, res, next)=>{
    //    if(!req.body.listing){
    //        throw new ExpressError(400, "send valid data for listing");
    //    }
      
       let newListing = new Listing(req.body.listing);
       
    //    if(!newListing.title){
    //       throw new ExpressError(400, "title is missing");
    //    }
    //    if(!newListing.description){
    //       throw new ExpressError(400, "description is missing");
    //    }
    //    if(!newListing.country){
    //       throw new ExpressError(400, "country is missing");
    //    }

       await newListing.save();
        res.redirect("/listings");
    })
    
); 

//edit route
app.get("/listings/:id/edit",wrapAsync( async(req, res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", {listing});
}));

//update route
app.put("/listings/:id",validateListing, wrapAsync(async(req, res)=>{
    let {id} = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id", wrapAsync(async(req, res)=>{
    let {id} = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
}));

//Reviews
//post route
app.post("/listings/:id/reviews", validateReview, wrapAsync(async(req, res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
}));

// delete Review Route
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async(req,res)=>{
    let {id, reviewId} = req.params;

    await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
}))

app.all("*", (req, res, next)=>{
    throw new ExpressError(404, "Page not found");
});

app.use((err, req, res, next)=>{
    // res.send("something went wrong");
    let {statusCode=500, message="Something gone wrong"} = err;
    // res.status(statusCode).send(message);
    res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080, ()=>{
    console.log("app listening to port 8080");
});