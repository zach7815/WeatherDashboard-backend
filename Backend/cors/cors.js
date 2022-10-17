import cors from "cors";

const corsOptions ={
    origin:"https://weather-dashboard.onrender.com/",
    optionSuccessStatus:200,
}
 export default cors(corsOptions);