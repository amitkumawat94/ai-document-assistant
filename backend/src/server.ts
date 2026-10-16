import express from "express";
import cors from "cors";
import api from "./routes/api";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", api);

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "Welcome to node application.",
  });
});

app.listen(5000, () => {
  console.log("Server running");
});