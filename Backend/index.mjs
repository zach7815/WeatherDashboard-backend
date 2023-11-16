import express from 'express';
import * as dotenv from 'dotenv';
import nodeFetch from 'node-fetch';
import { createApi } from 'unsplash-js';
import openCage from 'opencage-api-client';


dotenv.config();
const app = express();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'https://weather-dashboard.onrender.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});``




app.use(express.static('public'));
app.use(express.json({limit:'1mb'}));
app.use(express.json());

const PORT = process.env.PORT || 10000;
const openCageKey= process.env.OPENCAGE_API_KEY;
const unSplashAccessKey=process.env.UNSPLASH_ACESS_KEY;
const openWeatherKey=process.env.OPEN_WEATHER_KEY;


// Main functions
const getImage= async (location)=>{
   try{
    const api= await createApi({
        accessKey:unSplashAccessKey,
        fetch:nodeFetch
    })
   const photoList= await api.search.getPhotos(
    {query:location.city,
         page:1, perPage:10,
         orderBy:"relevant",
         orientation:"landscape"
        });

        const {response}= photoList;
        const results= response.results;
        const randomPhotoInfo= results[randomNumber(10)]

        const {alt_description, links, urls, user }= randomPhotoInfo||{};


          const refinedImageData= {
            description:alt_description,
            unsplash_url:links,
            display_urls:urls,
            photographerInfo:user
        };
        return refinedImageData;
    }
    catch(err){
        console.log(err)
    }
};
const destructGeoData = (openCageData)=>{

    const {results} =openCageData;
        const components= results[0]["components"];
         let location={
         timezone:results[0]["annotations"]["timezone"]["name"],
         }
        if(components.hasOwnProperty("city")){
             location.city= components["city"]
             }
                else if(components.hasOwnProperty("town")){
                    location.town= components["town"]
                }
                else{
                    location.country=components["country"]
                }

                return location
};

const isCity = (calltype,lat, lng, city)=>{
    let URL;
    if(calltype==="forecast")
    {
        if(!city){
            URL=`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${openWeatherKey}`;
           return URL;
       }
       else{
            URL= `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${openWeatherKey}`;
            return URL;
       }
    }
    else{
        if(!city){
            URL=`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${openWeatherKey}`;
           return URL;
       }
       else{
            URL= `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${openWeatherKey}`;
            return URL;
       }
    }

};

const getWeather = async (calltype, lat, lng, city)=>{
  const URL=isCity(calltype, lat,lng,city);
    const response= await nodeFetch(URL);
    const result= await response.json();
    const {weather,main, wind, sys, name}= result;

    const currentWeather={
        weather:weather,
        temperature:main,
        wind:wind,
        dayLength:sys,
        location:name,
    }
    let weatherPresent= Object.values(currentWeather).every(value=>value===undefined);
    if(weatherPresent===false){
        return currentWeather;
    }
    else{
        return undefined;
    }

};


const getForecast = async (calltype,lat, lng, city)=>{
    const URL= await isCity(calltype,lat,lng,city);
    const response= await nodeFetch(URL);
const result= await response.json();

if(result.cod==="404"){
    return undefined
}
else{
    const {list}=result;
    const day= ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const tempArray = list.map(object=>object["main"]["temp"]);
    const humidityArray= list.map(object=>object["main"]["humidity"]);
    const iconArray =  list.map(object=>object["weather"][0]["icon"]);
    const weatherDescrp = list.map(object=>object["weather"][0]["description"]);
    const dayIndex = [...new Set(list.map(object=> day[new Date(object["dt_txt"].slice(0, 11)).getDay()]))];
    const time =  list.map(object=> object["dt_txt"].slice(11));


    const daysArray = [];
    for (let i=0; i<5; i++){
      daysArray.push({
        times:time.splice(0,5),
        day:dayIndex.splice(0,1),
        weatherIcons:iconArray.splice(0,5),
        Description:weatherDescrp.splice(0,5),
        temperature:tempArray.splice(0,5),
        humidity:humidityArray.splice(0,5)
    }) ;
    };
    return daysArray;
}


};

const randomNumber = (max)=>{
    return Math.round(Math.random()*max)
};



// Post requests
app.post("/api/search", async (req,res)=>{
const location= req.body;
try{
const photoInfo= await getImage(location);
const weather= await getWeather("weather",undefined, undefined, location.city);
const forecast = await getForecast("forecast",undefined, undefined, location.city);
      console.log(photoInfo, weather, forecast);
res.json([photoInfo, weather, forecast])
res.end()
}
    catch(error){
         res.status(500).json(error.message);
    }

})

app.post("/api/unsplashImages" ,async (req,res)=>{


    let lat=req.body.lat;
    let  lng=req.body.lng;

    console.log(lat, lng)
        let geoData=`${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;

try{
 const result = await openCage.geocode({q:geoData, key:openCageKey, language:"En"});
const locationData = await result;
const locationObject =await destructGeoData(locationData);
const refinedImageData = await getImage(locationObject);
    console.log(refinedImageData);
res.json(refinedImageData);
res.end();
}

catch(error){
 res.status(500).json(error.message);
}

})

app.post("/api/currentWeather" , async (req,res)=>{
 const lat=req.body.lat;
 const lng=req.body.lng;
    try{
const currentWeather = await getWeather("weather",lat,lng);
res.json(currentWeather);
res.end()
    }
    catch(error){
         res.status(500).json(error.message);
    }
})

app.post("/api/fiveDayForecast", async(req,res)=>{
let lat=req.body.lat;
let lng=req.body.lng;
console.log(lat, lng)
    try{
 const forecast = await getForecast("forecast",lat, lng);
          console.log(forecast);
res.json(forecast);
res.end();
    }
catch (error) {
    res.status(500).json(error.message);
  }
})


app.listen(PORT, ()=>{
    console.log(`listening on port: ${PORT}`)
});
